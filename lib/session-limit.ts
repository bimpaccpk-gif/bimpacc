/**
 * Device / session limit policy (pure; no I/O).
 *
 * Students may be signed in on at most STUDENT_MAX_SESSIONS devices at once (default 2).
 * A new sign-in beyond the limit signs out the OLDEST sessions, so the newest device always wins.
 * Admins and instructors are not limited. SESSION_LIMIT_ENFORCEMENT=off is the emergency switch.
 */

export const DEFAULT_STUDENT_MAX_SESSIONS = 2;

export function getSessionLimit(
  role: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): number | null {
  if ((env.SESSION_LIMIT_ENFORCEMENT ?? "").trim().toLowerCase() === "off") return null;
  if (role !== "student") return null;

  const parsed = Number.parseInt(env.STUDENT_MAX_SESSIONS ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_STUDENT_MAX_SESSIONS;
  return Math.min(10, Math.max(1, parsed));
}

export interface ActiveSession {
  session_id: string;
  created_at: string;
}

/**
 * Which sessions to end so that at most `limit` remain. The current session is always kept,
 * then the newest others; everything older is returned for revocation.
 */
export function sessionsToRevoke(
  active: ActiveSession[],
  limit: number,
  currentSessionId: string
): string[] {
  const others = active
    .filter((s) => s.session_id !== currentSessionId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const keepOthers = Math.max(0, limit - 1);
  return others.slice(keepOthers).map((s) => s.session_id);
}

/** Human-readable device label from a user agent (for the admin device list). */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}
