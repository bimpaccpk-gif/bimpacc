import type { LucideIcon } from "lucide-react"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StatTileDelta {
  value: string
  direction: "up" | "down"
  /** Whether this movement is desirable. Defaults to `direction === "up"`. */
  good?: boolean
}

interface StatTileProps {
  label: string
  value: React.ReactNode
  delta?: StatTileDelta
  hint?: string
  icon?: LucideIcon
  className?: string
}

/**
 * KPI card for dashboards. Mirrors the Card surface (rounded-xl bg-card,
 * ring-1 ring-foreground/10) without importing Card so it stays server-safe.
 * Server-compatible — no hooks, no state.
 */
function StatTile({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  className,
}: StatTileProps) {
  const isGood = delta?.good ?? delta?.direction === "up"
  const DeltaIcon = delta?.direction === "down" ? TrendingDownIcon : TrendingUpIcon

  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "flex flex-col rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      <div data-slot="stat-tile-header" className="flex items-start justify-between gap-3">
        <div className="text-sm text-muted-foreground">{label}</div>

        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon aria-hidden="true" className="size-4 text-primary" />
          </div>
        ) : null}
      </div>

      <div
        data-slot="stat-tile-value"
        className="mt-1 text-2xl font-semibold tabular-nums tracking-tight"
      >
        {value}
      </div>

      {delta ? (
        <div data-slot="stat-tile-delta" className="mt-1 flex items-center gap-1 text-xs">
          <DeltaIcon
            aria-hidden="true"
            className={cn("size-3.5", isGood ? "text-success" : "text-destructive")}
          />
          <span className="text-muted-foreground">{delta.value}</span>
        </div>
      ) : null}

      {hint ? (
        <p data-slot="stat-tile-hint" className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export { StatTile }
export type { StatTileProps, StatTileDelta }
