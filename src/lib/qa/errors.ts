export class InvalidAuditTargetError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "InvalidAuditTargetError";
  }
}

export class UnsafeAuditTargetError extends Error {
  readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = "UnsafeAuditTargetError";
  }
}

export class AuditTargetLoadError extends Error {
  readonly statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name = "AuditTargetLoadError";
  }
}

export function getPublicErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Audit failed.";
}
