import "server-only";

import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. On Vercel, x-forwarded-for is set by
 * the platform (the first hop is the real client); behind other proxies make
 * sure the proxy overwrites, not appends to, a client-supplied header.
 * Returns "unknown" when no IP is available (all such requests then share one
 * bucket, which errs on the side of limiting).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip")?.trim() || "";
  // Keep the key bounded and free of control characters.
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "unknown";
}
