import * as React from "react";

import { cn } from "@/lib/utils";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  mono?: boolean;
  capitalize?: boolean;
}

/**
 * Single label/value line used across the user detail info cards. Renders an
 * italic muted placeholder when `value` is empty. Server-compatible — no
 * hooks, no state.
 */
function InfoRow({ label, value, icon, mono = false, capitalize = false }: InfoRowProps) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div data-slot="info-row" className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        data-slot="info-row-value"
        className={cn(
          "text-right text-sm font-medium",
          mono && "font-mono text-xs",
          capitalize && "capitalize",
          isEmpty && "text-muted-foreground/50 italic"
        )}
      >
        {icon ? <span className="mr-1 inline-flex align-text-top">{icon}</span> : null}
        {!isEmpty ? value : "Not provided"}
      </span>
    </div>
  );
}

export { InfoRow };
export type { InfoRowProps };
