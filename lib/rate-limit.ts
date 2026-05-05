/**
 * Distributed rate limiter for server actions.
 * Uses Upstash Redis via REST API to track attempts across Vercel instances.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Execute a command against Upstash Redis REST API.
 */
async function redisCommand(command: string, ...args: any[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Fallback to allow if Redis is not configured (e.g. local dev without env vars)
    console.warn("Upstash Redis credentials missing. Rate limiting bypassed.");
    return null;
  }

  const res = await fetch(`${url}/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command, ...args]),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Redis error: ${await res.text()}`);
  }
  
  const data = await res.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (e.g., email, IP)
 * @param maxAttempts - Maximum allowed requests in the window
 * @param windowMs - Window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  try {
    const count = await redisCommand("INCR", key);
    
    // If fallback was triggered (no env vars), just allow
    if (count === null) {
      return { allowed: true, remaining: maxAttempts };
    }

    if (count === 1) {
      await redisCommand("PEXPIRE", key, windowMs);
    }

    if (count > maxAttempts) {
      const ttl = await redisCommand("PTTL", key);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: ttl > 0 ? ttl : windowMs,
      };
    }

    return { allowed: true, remaining: maxAttempts - count };
  } catch (error) {
    console.error("[RateLimit] Error:", error);
    // Fail open if Redis is down
    return { allowed: true, remaining: 1 };
  }
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export async function rateLimitReset(key: string): Promise<void> {
  try {
    await redisCommand("DEL", key);
  } catch (error) {
    console.error("[RateLimit] Error resetting:", error);
  }
}

/**
 * Get remaining attempts for a key.
 */
export async function rateLimitRemaining(key: string, maxAttempts: number = 10): Promise<number> {
  try {
    const countStr = await redisCommand("GET", key);
    if (countStr === null) return maxAttempts;
    
    const count = parseInt(countStr);
    if (isNaN(count)) return maxAttempts;
    
    return Math.max(0, maxAttempts - count);
  } catch (error) {
    return maxAttempts;
  }
}
