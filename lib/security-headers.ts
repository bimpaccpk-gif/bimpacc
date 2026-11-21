/**
 * Security headers shared by the proxy. Kept pure (no Next imports) so it can
 * be unit tested.
 *
 * CSP uses a per-request nonce + 'strict-dynamic' (see Next.js CSP guide), so
 * pages are rendered dynamically. Inline styles stay allowed ('unsafe-inline'
 * for style-src only): UI libraries (sonner, Radix, Recharts) inject styles at
 * runtime, and style injection is far lower risk than script injection.
 */

const SUPABASE_HOSTS = "https://*.supabase.co";
const SUPABASE_WS = "wss://*.supabase.co";
const YOUTUBE_FRAMES = "https://www.youtube-nocookie.com https://www.youtube.com";
// Thumbnails + Google profile pictures.
const IMAGE_HOSTS = `${SUPABASE_HOSTS} https://i.ytimg.com https://lh3.googleusercontent.com`;

export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced bootstrap load further scripts (incl. the
    // YouTube IFrame API); the host sources are only a fallback for old browsers.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.youtube.com${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${IMAGE_HOSTS}`,
    "font-src 'self' data:",
    `connect-src 'self' ${SUPABASE_HOSTS} ${SUPABASE_WS}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
    `media-src 'self' blob: ${SUPABASE_HOSTS}`,
    `frame-src ${YOUTUBE_FRAMES}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** Headers added to every response (including redirects). */
export function staticSecurityHeaders(isDev: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Screen-capture/display-capture is blocked; the lesson player needs
    // fullscreen + autoplay for its own origin and the YouTube embed.
    "Permissions-Policy":
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=(), fullscreen=(self "https://www.youtube-nocookie.com" "https://www.youtube.com"), autoplay=(self "https://www.youtube-nocookie.com" "https://www.youtube.com")',
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };
  // HSTS only makes sense over HTTPS; sending it in dev would pin localhost.
  if (!isDev) {
    headers["Strict-Transport-Security"] = "max-age=63072000";
  }
  return headers;
}
