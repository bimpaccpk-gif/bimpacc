import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({ rpc }) }));

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("maps an allowed response", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, remaining: 3, retry_after_ms: null }], error: null });
    expect(await rateLimit("k", 5, 60_000)).toEqual({ allowed: true, remaining: 3 });
  });

  it("maps a blocked response with retry-after", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, remaining: 0, retry_after_ms: 4000 }], error: null });
    expect(await rateLimit("k", 5, 60_000)).toEqual({ allowed: false, remaining: 0, retryAfterMs: 4000 });
  });

  it("hashes the key so identifiers never reach the database", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, remaining: 1, retry_after_ms: null }], error: null });
    await rateLimit("signin:victim@gmail.com", 5, 60_000);
    const args = rpc.mock.calls[0][1];
    expect(args.p_key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args)).not.toContain("victim");
  });

  it("fails OPEN by default when the limiter errors", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("db down") });
    expect((await rateLimit("k", 5, 60_000)).allowed).toBe(true);
  });

  it("fails CLOSED when requested", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("db down") });
    const r = await rateLimit("k", 5, 60_000, { failClosed: true });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("refuses invalid configuration", async () => {
    expect((await rateLimit("", 5, 60_000)).allowed).toBe(false);
    expect((await rateLimit("k", 0, 60_000)).allowed).toBe(false);
  });
});
