import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_FINGERPRINT_AGE_MS,
  SIMILARITY_THRESHOLD,
  computeSimilarityScore,
  isFingerprintFresh,
} from "@/lib/fingerprint-utils";
import type { DeviceComponents } from "@/types";

const base: DeviceComponents = {
  platform: "win",
  platformVersion: "11",
  screenResolution: "1920x1080",
  availableScreenSize: "1920x1040",
  colorDepth: 24,
  devicePixelRatio: 1,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  maxTouchPoints: 0,
  webglRenderer: null,
  webglVendor: null,
  webglRendererRaw: null,
  webglVendorRaw: null,
  canvasFingerprint: "a",
  audioFingerprint: "b",
};

describe("computeSimilarityScore", () => {
  it("is 1 for identical devices", () => {
    expect(computeSimilarityScore(base, { ...base })).toBe(1);
  });

  it("ignores browser-specific signals (canvas, audio, GPU)", () => {
    const other = { ...base, canvasFingerprint: "x", audioFingerprint: "y", webglRenderer: "z" };
    expect(computeSimilarityScore(base, other)).toBe(1);
  });

  it("drops below the threshold for a different machine", () => {
    const other = {
      ...base,
      platform: "mac",
      screenResolution: "2560x1440",
      hardwareConcurrency: 10,
    };
    expect(computeSimilarityScore(base, other)).toBeLessThan(SIMILARITY_THRESHOLD);
  });

  it("is case/whitespace insensitive", () => {
    expect(computeSimilarityScore(base, { ...base, platform: " WIN " })).toBe(1);
  });

  it("treats one-sided null as a mismatch and both-null as a match", () => {
    expect(computeSimilarityScore(base, { ...base, hardwareConcurrency: null })).toBeLessThan(1);
    expect(
      computeSimilarityScore(
        { ...base, hardwareConcurrency: null },
        { ...base, hardwareConcurrency: null }
      )
    ).toBe(1);
  });
});

describe("isFingerprintFresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("accepts recent fingerprints", () => {
    expect(isFingerprintFresh(Date.now() - 1000)).toBe(true);
    expect(isFingerprintFresh(Date.now() - MAX_FINGERPRINT_AGE_MS)).toBe(true);
  });

  it("rejects stale (replayed) and future-dated fingerprints", () => {
    expect(isFingerprintFresh(Date.now() - MAX_FINGERPRINT_AGE_MS - 1)).toBe(false);
    expect(isFingerprintFresh(Date.now() + 5000)).toBe(false);
  });
});
