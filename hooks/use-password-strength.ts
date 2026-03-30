"use client";

import { useMemo } from "react";

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: string;
  colorClass: string;
  textClass: string;
  requirements: { label: string; met: boolean }[];
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-blue-500",
  "bg-green-500",
];
const STRENGTH_TEXT_COLORS = [
  "text-red-500",
  "text-red-500",
  "text-amber-500",
  "text-blue-500",
  "text-green-500",
];

export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => {
    const requirements = [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One number", met: /[0-9]/.test(password) },
      { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
    ];

    const score = requirements.filter((r) => r.met).length;

    return {
      score,
      label: STRENGTH_LABELS[score],
      colorClass: STRENGTH_COLORS[score],
      textClass: STRENGTH_TEXT_COLORS[score],
      requirements,
    };
  }, [password]);
}
