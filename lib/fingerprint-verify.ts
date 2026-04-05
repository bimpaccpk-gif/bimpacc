"use server";

import { createClient } from "@/lib/supabase/server";
import { computeSimilarityScore, SIMILARITY_THRESHOLD } from "@/lib/fingerprint-utils";
import type { DeviceComponents } from "@/types";

/**
 * Server action: verify the current session's device fingerprint matches
 * the stored one. Used by the heartbeat component for periodic checks.
 */
export async function verifySessionDevice(
  currentHardwareFingerprint: string,
  currentComponents: DeviceComponents
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { valid: false, reason: "no_session" };
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, hardware_fingerprint, device_components")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { valid: false, reason: "no_profile" };
    }

    // Only enforce for students
    if (profile.role !== "student") {
      return { valid: true };
    }

    const storedFingerprint = profile.hardware_fingerprint as string | null;

    // No stored fingerprint means not yet bound — allow
    if (!storedFingerprint) {
      return { valid: true };
    }

    // Exact match
    if (storedFingerprint === currentHardwareFingerprint) {
      return { valid: true };
    }

    // Fuzzy match using components
    const storedComponents = profile.device_components as DeviceComponents | null;
    if (storedComponents) {
      const score = computeSimilarityScore(storedComponents, currentComponents);
      if (score >= SIMILARITY_THRESHOLD) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: `device_mismatch_score_${Math.round(score * 100)}`,
      };
    }

    // No stored components, hash mismatch — fail
    return { valid: false, reason: "device_mismatch" };
  } catch (error) {
    console.error("[Fingerprint Verify] Error:", error);
    return { valid: false, reason: "verification_error" };
  }
}
