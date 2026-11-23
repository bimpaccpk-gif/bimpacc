import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Shared content cache on Upstash Redis.
 *
 * ONLY for data that is identical for every user (course structure, lesson lists). Never cache
 * anything that depends on who is asking: authorization, enrollment, progress, quiz results.
 * Access checks always run separately, before cached data is used.
 *
 * Invalidation: every key embeds a global "epoch". Any content write calls `invalidateContentCache()`,
 * which increments the epoch, so all older entries become unreachable at once (and expire by TTL).
 * A reader that loaded data before an invalidation stores it under the OLD epoch, so it can never
 * be served afterwards.
 *
 * Fail-open: when Redis is unconfigured, slow or down, we simply read from the database.
 */

const EPOCH_KEY = "cache:epoch";
const DEFAULT_TTL_SECONDS = 600;
const REDIS_TIMEOUT_MS = 1500;

// One round trip: read the epoch and the value stored under it.
const READ_SCRIPT = `
local e = redis.call('GET', KEYS[1]) or '0'
local v = redis.call('GET', ARGV[1] .. ':' .. e)
if not v then return {e} end
return {e, v}
`;

let client: Redis | null | undefined;

function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  client =
    url && token
      ? new Redis({
          url,
          token,
          // Keep raw strings: we serialise and parse ourselves.
          automaticDeserialization: false,
          retry: false,
          signal: () => AbortSignal.timeout(REDIS_TIMEOUT_MS),
        })
      : null;
  return client;
}

/** Whether the shared cache is configured (used by tests and diagnostics). */
export function isContentCacheEnabled(): boolean {
  return redis() !== null;
}

/**
 * Returns the cached value for (name, parts), or runs `loader` and stores the result.
 * `loader` must THROW on a database error so that an error is never cached as an empty result.
 */
export async function cachedShared<T>(
  name: string,
  parts: string[],
  loader: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const r = redis();
  if (!r) return loader();

  const base = `cache:${name}:${parts.join(":")}`;
  let epoch = "0";
  try {
    const result = (await r.eval(READ_SCRIPT, [EPOCH_KEY], [base])) as unknown[];
    epoch = String(result[0] ?? "0");
    const raw = result[1];
    if (typeof raw === "string") return JSON.parse(raw) as T;
  } catch (err) {
    console.error("[cache] read failed, using database:", err instanceof Error ? err.message : err);
    return loader();
  }

  const value = await loader();
  try {
    await r.set(`${base}:${epoch}`, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    console.error("[cache] write failed:", err instanceof Error ? err.message : err);
  }
  return value;
}

/** Drops every cached entry. Call after ANY write to courses, semesters, subjects or lessons. */
export async function invalidateContentCache(): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.incr(EPOCH_KEY);
  } catch (err) {
    // Entries still expire by TTL, so a failed bump means at most TTL seconds of stale content.
    console.error("[cache] invalidate failed:", err instanceof Error ? err.message : err);
  }
}
