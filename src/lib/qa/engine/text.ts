export function trimText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function sanitizeBrowserError(error: unknown) {
  const message = getErrorMessage(error);
  return trimText(message.split("\n")[0] ?? message, 240);
}
