/**
 * Maximum session lifetime: every user must sign in again after SESSION_MAX_HOURS
 * (default 7), no matter how active they are.
 *
 * Supabase's own "time-box user sessions" setting is a Pro-plan feature, so this
 * is enforced in the app. The start of the session comes from the JWT's `amr`
 * claim (authentication method references: [{ method, timestamp }]). Those
 * timestamps record when the user actually authenticated and do NOT move when the
 * access token is refreshed, and since the JWT is signed a client cannot extend
 * its own session. (`iat` would not work: it resets on every refresh.)
 *
 * Pure (no I/O) so it is unit tested; used by proxy.ts and lib/dal.ts.
 */

export const DEFAULT_SESSION_MAX_HOURS = 7;

export function getSessionMaxSeconds(
  hoursValue: string | undefined = process.env.SESSION_MAX_HOURS
): number {
  const hours = Number(hoursValue);
  // Ignore missing / invalid / non-positive overrides; never silently disable the limit.
  const safe = Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SESSION_MAX_HOURS;
  return Math.round(safe * 3600);
}

interface AmrEntry {
  method?: unknown;
  timestamp?: unknown;
}

/**
 * Unix time (seconds) at which this session was first authenticated: the OLDEST amr
 * timestamp (a later TOTP entry must not make the session look younger).
 * Returns null when the claim is missing or has no usable timestamps.
 */
export function sessionStartedAt(claims: { amr?: unknown } | null | undefined): number | null {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return null;

  let oldest: number | null = null;
  for (const entry of amr as AmrEntry[]) {
    const ts = entry && typeof entry === "object" ? entry.timestamp : undefined;
    if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
      oldest = oldest === null ? ts : Math.min(oldest, ts);
    }
  }
  return oldest;
}

/**
 * True when the session is older than the maximum. When the start time is unknown the
 * session is NOT treated as expired: wrongly logging everyone out is worse than
 * skipping the limit, and the claim is always present on Supabase-issued tokens.
 */
export function isSessionExpired(
  claims: { amr?: unknown } | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  maxSeconds: number = getSessionMaxSeconds()
): boolean {
  const startedAt = sessionStartedAt(claims);
  if (startedAt === null) return false;
  return nowSeconds - startedAt >= maxSeconds;
}
