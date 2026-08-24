import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

interface RateLimitRow {
  allowed: boolean;
  remaining: number;
  retry_after_ms: number | null;
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
  if (
    !key ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    !Number.isInteger(windowMs) ||
    windowMs < 1000
  ) {
    console.error("[RateLimit] Invalid limiter configuration");
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(1000, windowMs) };
  }

  // Hash identifiers before storage so email addresses never enter the limiter table.
  const keyHash = createHash("sha256").update(key).digest("hex");

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_auth_rate_limit", {
      p_key_hash: keyHash,
      p_max_attempts: maxAttempts,
      p_window_ms: windowMs,
    });

    if (error) throw error;

    const result = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
    if (!result || typeof result.allowed !== "boolean") {
      throw new Error("Supabase returned an invalid rate-limit response");
    }

    const remaining = Math.max(0, Number(result.remaining) || 0);
    const retryAfterMs =
      result.retry_after_ms === null
        ? undefined
        : Math.max(0, Number(result.retry_after_ms) || windowMs);

    return {
      allowed: result.allowed,
      remaining,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    };
  } catch (error) {
    // Supabase Auth applies its own platform limits. Fail open here so a
    // temporary database issue does not lock every legitimate user out.
    console.error(
      "[RateLimit] Supabase limiter unavailable:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return { allowed: true, remaining: maxAttempts };
  }
}
