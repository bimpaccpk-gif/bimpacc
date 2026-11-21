import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce, staticSecurityHeaders } from "@/lib/security-headers";

describe("buildCsp", () => {
  const csp = buildCsp("abc123", false);
  const directive = (name: string) =>
    csp
      .split("; ")
      .find((d) => d.startsWith(`${name} `))
      ?.slice(name.length + 1);

  it("uses the nonce with strict-dynamic and no unsafe script sources in production", () => {
    const script = directive("script-src")!;
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("unsafe-inline");
    expect(script).not.toContain("unsafe-eval");
  });

  it("locks down framing, plugins, base-uri and forms", () => {
    expect(directive("frame-ancestors")).toBe("'none'");
    expect(directive("object-src")).toBe("'none'");
    expect(directive("base-uri")).toBe("'self'");
    expect(directive("form-action")).toBe("'self'");
    expect(directive("default-src")).toBe("'self'");
  });

  it("only allows YouTube embeds as frames", () => {
    expect(directive("frame-src")).toBe(
      "https://www.youtube-nocookie.com https://www.youtube.com"
    );
  });

  it("upgrades insecure requests in production only; allows eval/ws in dev", () => {
    expect(csp).toContain("upgrade-insecure-requests");
    const dev = buildCsp("n", true);
    expect(dev).not.toContain("upgrade-insecure-requests");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws://localhost:*");
  });
});

describe("generateNonce", () => {
  it("is unique per call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe("staticSecurityHeaders", () => {
  it("sends HSTS only outside development", () => {
    expect(staticSecurityHeaders(false)["Strict-Transport-Security"]).toBeDefined();
    expect(staticSecurityHeaders(true)["Strict-Transport-Security"]).toBeUndefined();
  });

  it("never sends the obsolete X-XSS-Protection header", () => {
    expect(staticSecurityHeaders(false)["X-XSS-Protection"]).toBeUndefined();
  });

  it("blocks screen capture, camera and microphone", () => {
    const pp = staticSecurityHeaders(false)["Permissions-Policy"];
    expect(pp).toContain("display-capture=()");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });
});
