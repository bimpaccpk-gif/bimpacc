/** Safe message from an unknown thrown value (catch clauses are `unknown` under strict mode). */
export function errorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
