"use client";

import * as React from "react";
import { ChartLineIcon, TableIcon, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** The plot. Rendered inside the fixed-height ResponsiveContainer slot. */
  children: React.ReactNode;
  /**
   * Table twin of the same data, swapped in by the "View as table" toggle.
   * Mandatory per our chart design rules — tooltips enhance, tables guarantee.
   */
  table: React.ReactNode;
  /** When true the plot is replaced by an empty state and the toggle hides. */
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Shared shell for dashboard charts: card header with title/subtitle and a
 * table toggle, a fixed-height plot slot (h-64 — sized to include the x-axis
 * band so labels never clip into a nested scroll), and a collapsible table
 * region rendering the same numbers.
 */
function ChartCard({
  title,
  subtitle,
  children,
  table,
  isEmpty = false,
  emptyIcon,
  emptyTitle = "No data yet",
  emptyDescription,
  className,
}: ChartCardProps) {
  const [showTable, setShowTable] = React.useState(false);
  const toggleLabel = showTable ? "View as chart" : "View as table";

  return (
    <Card data-slot="chart-card" className={cn("h-full", className)}>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}

        {!isEmpty ? (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={toggleLabel}
              aria-pressed={showTable}
              title={toggleLabel}
              onClick={() => setShowTable((previous) => !previous)}
            >
              {showTable ? <ChartLineIcon aria-hidden="true" /> : <TableIcon aria-hidden="true" />}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            className="border-border/60 bg-muted/30 py-10"
          />
        ) : showTable ? (
          <div
            data-slot="chart-card-table"
            className="max-h-64 overflow-y-auto rounded-lg border border-border"
          >
            {table}
          </div>
        ) : (
          <div data-slot="chart-card-plot" className="h-64">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { ChartCard };
export type { ChartCardProps };
