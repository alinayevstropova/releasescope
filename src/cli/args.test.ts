import { describe, expect, test } from "vitest";
import { CliUsageError, parseCliArgs } from "./args";

describe("parseCliArgs", () => {
  test("parses the audit command with CI options", () => {
    expect(
      parseCliArgs([
        "audit",
        "https://example.com",
        "--viewport",
        "mobile",
        "--json",
        "--output",
        "audit.json",
        "--artifact-dir=releasescope-artifacts",
        "--no-ai",
        "--fail-on",
        "review",
      ]),
    ).toEqual({
      command: "audit",
      url: "https://example.com",
      viewport: "mobile",
      format: "json",
      outputPath: "audit.json",
      artifactDir: "releasescope-artifacts",
      includeAi: false,
      demoMode: false,
      notes: undefined,
      failOn: "review",
    });
  });

  test("returns help for empty invocations", () => {
    expect(parseCliArgs([])).toEqual({ command: "help" });
  });

  test("ignores the argument separator passed by the bin shim", () => {
    const command = parseCliArgs(["--", "audit", "https://example.com", "--demo"]);

    expect(command).toMatchObject({
      command: "audit",
      url: "https://example.com",
      demoMode: true,
    });
  });

  test("rejects unsupported options", () => {
    expect(() => parseCliArgs(["audit", "https://example.com", "--bad"])).toThrow(CliUsageError);
  });
});
