/**
 * In-memory rate limiter for server actions.
 * Uses a sliding window count per key (IP or email).
 * Max attempts reset after the window duration.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., email, IP)
 * @param maxAttempts - Maximum allowed requests in the window
 * @param windowMs - Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count };
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function rateLimitReset(key: string): void {
  store.delete(key);
}

/**
 * Get remaining attempts for a key.
 */
export function rateLimitRemaining(key: string, maxAttempts: number = 10): number {
  const entry = store.get(key);
  if (!entry || entry.resetAt <= Date.now()) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}
