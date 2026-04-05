import type { DeviceComponents } from "@/types";

/**
 * Fuzzy-match two sets of device components using weighted scoring.
 * Returns a similarity score from 0 to 1.
 *
 * ONLY compares the 6 OS-level signals that are guaranteed identical
 * across all browsers on the same device. Everything else is forensic-only.
 */
export function computeSimilarityScore(
  stored: DeviceComponents,
  current: DeviceComponents
): number {
  // ONLY OS-level, 100% cross-browser reliable signals
  // GPU, canvas, audio, deviceMemory are ALL excluded
  const comparisons: { key: keyof DeviceComponents; weight: number }[] = [
    { key: "platform", weight: 3 },           // normalized: "mac", "win", etc.
    { key: "screenResolution", weight: 3 },    // screen.width x screen.height
    { key: "colorDepth", weight: 1 },          // screen.colorDepth
    { key: "devicePixelRatio", weight: 2 },    // window.devicePixelRatio
    { key: "hardwareConcurrency", weight: 3 }, // CPU cores
    { key: "maxTouchPoints", weight: 2 },      // touch support
  ];

  let matchedWeight = 0;
  let totalWeight = 0;

  for (const { key, weight } of comparisons) {
    totalWeight += weight;

    const storedVal = stored[key];
    const currentVal = current[key];

    // Both null/undefined counts as a match
    if (storedVal == null && currentVal == null) {
      matchedWeight += weight;
      continue;
    }

    // One is null, other is not → mismatch
    if (storedVal == null || currentVal == null) {
      continue;
    }

    // String comparison (case-insensitive, trimmed)
    if (
      String(storedVal).toLowerCase().trim() ===
      String(currentVal).toLowerCase().trim()
    ) {
      matchedWeight += weight;
    }
  }

  return totalWeight > 0 ? matchedWeight / totalWeight : 0;
}

/** Threshold above which we consider it the same device (80%) */
export const SIMILARITY_THRESHOLD = 0.8;

/** Maximum age of a fingerprint submission (30 seconds) */
export const MAX_FINGERPRINT_AGE_MS = 30_000;

/**
 * Verify a fingerprint hasn't expired (anti-replay).
 * Returns true if the fingerprint was generated within the allowed window.
 */
export function isFingerprintFresh(generatedAt: number): boolean {
  const age = Date.now() - generatedAt;
  return age >= 0 && age <= MAX_FINGERPRINT_AGE_MS;
}
