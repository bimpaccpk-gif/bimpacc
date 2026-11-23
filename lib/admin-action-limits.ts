import "server-only";

import { rateLimit } from "@/lib/rate-limit";

const HOUR_MS = 60 * 60 * 1000;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Per-admin throttle for abuse-prone/destructive actions. Fails CLOSED: if the
 * limiter is unavailable the action is refused rather than allowed unbounded.
 * Returns an error message, or null when the call may proceed.
 */
export async function limitAdminAction(
  adminId: string,
  action: string,
  maxPerHour: number
): Promise<string | null> {
  const result = await rateLimit(`admin:${action}:${adminId}`, maxPerHour, HOUR_MS, {
    failClosed: true,
  });
  if (result.allowed) return null;
  const mins = Math.max(1, Math.ceil((result.retryAfterMs ?? 60_000) / 60000));
  return `Too many ${action.replace(/-/g, " ")} requests. Please try again in ${mins} minute(s).`;
}
