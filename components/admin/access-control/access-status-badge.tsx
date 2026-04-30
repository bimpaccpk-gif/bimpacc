"use client";

import { cn } from "@/lib/utils";
import type { AccessLevel, EffectiveStatus } from "@/app/actions/access-control";

interface AccessStatusBadgeProps {
  accessLevel: AccessLevel;
  effectiveStatus: EffectiveStatus;
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  granted: {
    label: "Granted",
    icon: "✓",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  blocked: {
    label: "Blocked",
    icon: "✗",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
  },
  not_set: {
    label: "Not Set",
    icon: "○",
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
};

const effectiveConfig = {
  accessible: {
    icon: "●",
    text: "text-emerald-600 dark:text-emerald-500",
  },
  blocked: {
    icon: "■",
    text: "text-red-600 dark:text-red-500",
  },
  inherited: {
    icon: "◐",
    text: "text-amber-600 dark:text-amber-500",
  },
};

export function AccessStatusBadge({
  accessLevel,
  effectiveStatus,
  showLabel = true,
  className,
}: AccessStatusBadgeProps) {
  const config = statusConfig[accessLevel];
  const effective = effectiveConfig[effectiveStatus];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
      {effectiveStatus === "inherited" && !showLabel && (
        <span className="text-amber-500 ml-0.5">(inherited)</span>
      )}
    </div>
  );
}

interface AccessEffectiveIndicatorProps {
  status: EffectiveStatus;
  className?: string;
}

export function AccessEffectiveIndicator({ status, className }: AccessEffectiveIndicatorProps) {
  const effective = effectiveConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        effective.text,
        className
      )}
    >
      <span>{effective.icon}</span>
      {status === "accessible" && "Accessible"}
      {status === "blocked" && "Blocked"}
      {status === "inherited" && "Inherited"}
    </span>
  );
}