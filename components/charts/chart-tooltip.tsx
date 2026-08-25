"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ChartTooltipRow {
  /** Secondary ink naming the series or measure. */
  label?: string;
  /** Strong, pre-formatted value — rendered before the label. */
  value: React.ReactNode;
  /**
   * Series colour for the short line-key that ties the row to its mark.
   * Optional — a single-series tooltip may omit it since the card title
   * already names the series.
   */
  color?: string;
  /** Optional one-line footnote (e.g. a funnel step definition). */
  hint?: string;
}

interface ChartTooltipProps {
  /** The hovered category, e.g. "August 2026". Muted ink above the rows. */
  label?: React.ReactNode;
  rows: Array<ChartTooltipRow>;
  className?: string;
}

/**
 * Shared hover readout for every chart card: popover surface, muted label,
 * values in foreground ink. Text never wears the series colour — identity is
 * carried by the small line-key beside each row.
 *
 * Recharts mounts this through `Tooltip content`, which supplies its own
 * positioned wrapper, so no chrome of our own beyond the surface styles.
 */
function ChartTooltip({ label, rows, className }: ChartTooltipProps) {
  return (
    <div
      data-slot="chart-tooltip"
      className={cn(
        "bg-popover text-popover-foreground pointer-events-none rounded-lg border border-border px-3 py-2 text-xs shadow-md",
        className
      )}
    >
      {label != null && label !== "" ? (
        <div data-slot="chart-tooltip-label" className="text-muted-foreground mb-1 font-medium">
          {label}
        </div>
      ) : null}

      <div data-slot="chart-tooltip-rows" className="space-y-1">
        {rows.map((row, index) => (
          <React.Fragment key={`${row.label ?? "value"}-${index}`}>
            <div data-slot="chart-tooltip-row" className="flex items-center gap-2">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              ) : null}

              <span className="font-medium tabular-nums text-foreground">{row.value}</span>

              {row.label ? <span className="text-muted-foreground">{row.label}</span> : null}
            </div>

            {row.hint ? (
              <p className="max-w-56 pl-5 whitespace-normal text-muted-foreground">{row.hint}</p>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export { ChartTooltip };
export type { ChartTooltipProps };
