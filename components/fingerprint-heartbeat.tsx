"use client";

import { useEffect, useRef, useCallback } from "react";
import { generateDeviceFingerprints } from "@/lib/device-fingerprint";
import { verifySessionDevice } from "@/lib/fingerprint-verify";
import { signOut } from "@/app/actions/auth";


/**
 * Invisible client component that periodically re-verifies
 * the user's device fingerprint against their stored binding.
 * If the device doesn't match (e.g. session cookie was transferred),
 * the user is immediately logged out.
 *
 * Only active for student accounts.
 */
export function FingerprintHeartbeat({ role }: { role: string }) {
  const isVerifyingRef = useRef(false);

  const verify = useCallback(async () => {
    // Prevent overlapping verifications
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    try {
      const fingerprints = await generateDeviceFingerprints();
      if (!fingerprints) return;

      const result = await verifySessionDevice(
        fingerprints.hardwareFingerprint,
        fingerprints.components
      );

      if (!result.valid && result.reason?.startsWith("device_mismatch")) {
        console.warn(
          "[Fingerprint Heartbeat] Device mismatch detected, logging out:",
          result.reason
        );
        await signOut();
      }
    } catch (error) {
      // Don't logout on network errors — only on explicit mismatch
      console.error("[Fingerprint Heartbeat] Verification error:", error);
    } finally {
      isVerifyingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only run heartbeat for students
    if (role !== "student") return;

    // Initial verification after a short delay (let the page settle)
    const initialTimeout = setTimeout(verify, 10_000);

    // Also verify on tab focus (catches session transfer scenarios)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verify();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [role, verify]);

  // Invisible — no UI rendered
  return null;
}
