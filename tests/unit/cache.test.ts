import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// ─── In-memory stand-in for Upstash (just enough of eval / set / incr) ──────
const store = new Map<string, string>();
const failures = { eval: false, set: false, incr: false };

vi.mock("@upstash/redis", () => ({
  Redis: class {
    async eval(_script: string, keys: string[], args: string[]) {
      if (failures.eval) throw new Error("redis down");
      const epoch = store.get(keys[0]) ?? "0";
      const v = store.get(`${args[0]}:${epoch}`);
      return v === undefined ? [epoch] : [epoch, v];
    }
    async set(key: string, value: string) {
      if (failures.set) throw new Error("redis down");
      store.set(key, value);
    }
    async incr(key: string) {
      if (failures.incr) throw new Error("redis down");
      store.set(key, String(Number(store.get(key) ?? "0") + 1));
    }
  },
}));

async function load(configured = true) {
  vi.resetModules();
  if (configured) {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
  } else {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  }
  return import("@/lib/cache");
}

beforeEach(() => {
  store.clear();
  failures.eval = failures.set = failures.incr = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cachedShared", () => {
  it("loads once, then serves from the cache", async () => {
    const { cachedShared } = await load();
    const loader = vi.fn().mockResolvedValue({ lessons: [1, 2, 3] });
    expect(await cachedShared("k", ["a"], loader)).toEqual({ lessons: [1, 2, 3] });
    expect(await cachedShared("k", ["a"], loader)).toEqual({ lessons: [1, 2, 3] });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("keeps different keys apart", async () => {
    const { cachedShared } = await load();
    expect(await cachedShared("k", ["a"], async () => "A")).toBe("A");
    expect(await cachedShared("k", ["b"], async () => "B")).toBe("B");
    expect(await cachedShared("k", ["a"], async () => "never")).toBe("A");
  });

  it("invalidation makes the next read hit the database again", async () => {
    const { cachedShared, invalidateContentCache } = await load();
    const loader = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    expect(await cachedShared("k", ["a"], loader)).toBe("old");
    await invalidateContentCache();
    expect(await cachedShared("k", ["a"], loader)).toBe("new");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("never serves data that was loaded before an invalidation (race)", async () => {
    const { cachedShared, invalidateContentCache } = await load();
    let release!: () => void;
    const slow = cachedShared("k", ["a"], async () => {
      await new Promise<void>((r) => (release = r));
      return "stale";
    });
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await invalidateContentCache(); // an admin edit lands while the slow read is in flight
    release();
    await slow;
    expect(await cachedShared("k", ["a"], async () => "fresh")).toBe("fresh");
  });

  it("falls back to the loader when Redis is not configured", async () => {
    const { cachedShared, isContentCacheEnabled } = await load(false);
    expect(isContentCacheEnabled()).toBe(false);
    const loader = vi.fn().mockResolvedValue("db");
    expect(await cachedShared("k", ["a"], loader)).toBe("db");
    expect(await cachedShared("k", ["a"], loader)).toBe("db");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("falls back to the loader when Redis is down, and still returns data", async () => {
    const { cachedShared } = await load();
    failures.eval = true;
    expect(await cachedShared("k", ["a"], async () => "db")).toBe("db");
  });

  it("still returns data when only the cache write fails", async () => {
    const { cachedShared } = await load();
    failures.set = true;
    expect(await cachedShared("k", ["a"], async () => "db")).toBe("db");
  });

  it("does not cache a loader error", async () => {
    const { cachedShared } = await load();
    await expect(
      cachedShared("k", ["a"], async () => {
        throw new Error("db error");
      })
    ).rejects.toThrow("db error");
    expect(await cachedShared("k", ["a"], async () => "recovered")).toBe("recovered");
  });

  it("invalidate never throws when Redis is down", async () => {
    const { invalidateContentCache } = await load();
    failures.incr = true;
    await expect(invalidateContentCache()).resolves.toBeUndefined();
  });
});

describe("cache invalidation coverage (static)", () => {
  const src = readFileSync(path.resolve(__dirname, "../../app/actions/courses.ts"), "utf8");

  it("every exported mutation in courses.ts invalidates the content cache", () => {
    const parts = src.split(/\nexport async function /).slice(1);
    const mutations = parts.filter((p) => /\.(insert|update|delete)\(/.test(p));
    expect(mutations.length).toBeGreaterThanOrEqual(15);
    const missing = mutations
      .filter((p) => !p.includes("await invalidateContentCache()"))
      .map((p) => p.slice(0, p.indexOf("(")));
    expect(missing).toEqual([]);
  });

  it("only course-structure data goes through the shared cache (no per-user helpers)", () => {
    const content = readFileSync(path.resolve(__dirname, "../../lib/course-content.ts"), "utf8");
    expect(content).not.toMatch(/lesson_progress|enrollments|auth\.uid|userId/);
  });
});
