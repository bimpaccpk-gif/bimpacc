import { afterEach, describe, expect, it, vi } from "vitest";
import { isPasswordAuthEnabled } from "@/lib/auth-config";

describe("isPasswordAuthEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled in production by default (Google only)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_PASSWORD_AUTH", "");
    expect(isPasswordAuthEnabled()).toBe(false);
  });

  it("is enabled in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isPasswordAuthEnabled()).toBe(true);
  });

  it("can be opted in explicitly (staging)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_PASSWORD_AUTH", "true");
    expect(isPasswordAuthEnabled()).toBe(true);
    vi.stubEnv("ENABLE_PASSWORD_AUTH", "1");
    expect(isPasswordAuthEnabled()).toBe(false);
  });
});
