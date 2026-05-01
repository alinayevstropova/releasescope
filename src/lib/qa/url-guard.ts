import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { InvalidAuditTargetError, UnsafeAuditTargetError } from "@/lib/qa/errors";

const PRIVATE_TARGETS_ALLOWED =
  process.env.ALLOW_PRIVATE_AUDIT_TARGETS === "true" || process.env.NODE_ENV !== "production";

export async function prepareAuditTargetUrl(rawUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidAuditTargetError("Enter a valid absolute URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidAuditTargetError("Only http and https URLs can be audited.");
  }

  if (parsed.username || parsed.password) {
    throw new InvalidAuditTargetError("Credentials in audit URLs are not supported.");
  }

  if (!PRIVATE_TARGETS_ALLOWED) {
    await assertPublicTarget(parsed.hostname);
  }

  return parsed.toString();
}

async function assertPublicTarget(hostname: string) {
  if (isPrivateHostname(hostname)) {
    throwPrivateTargetError();
  }

  if (isPrivateIp(hostname)) {
    throwPrivateTargetError();
  }

  if (isIP(hostname)) {
    return;
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.some((address) => isPrivateIp(address.address))) {
      throwPrivateTargetError();
    }
  } catch (error) {
    if (error instanceof UnsafeAuditTargetError) {
      throw error;
    }
  }
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized.endsWith(".localhost");
}

function isPrivateIp(value: string) {
  const ipVersion = isIP(value);

  if (ipVersion === 4) {
    const [first, second] = value.split(".").map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168)) ||
      (first === 198 && (second === 18 || second === 19 || second === 51)) ||
      (first === 203 && second === 0) ||
      first >= 224
    );
  }

  if (ipVersion === 6) {
    const normalized = value.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.")
    );
  }

  return false;
}

function throwPrivateTargetError(): never {
  throw new UnsafeAuditTargetError(
    "Private network targets are disabled in production. Set ALLOW_PRIVATE_AUDIT_TARGETS=true only for trusted QA environments.",
  );
}
