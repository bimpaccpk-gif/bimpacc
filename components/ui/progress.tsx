"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

/**
 * Accessible progress bar built on @base-ui/react/progress.
 * The root renders role="progressbar" with aria-valuemin/max/now handled by Base UI.
 *
 * `value` is 0-100 (or null for indeterminate, which renders a pulsing full-width bar).
 * The indicator is positioned with transform: scaleX() on a full-width element
 * (origin-left) instead of an inline percent width, so fill changes animate cheaply
 * via transform only.
 */
function Progress({
  className,
  value = 0,
  min = 0,
  max = 100,
  indicatorClassName,
  ...props
}: Omit<ProgressPrimitive.Root.Props, "value"> & {
  /** Current value between min and max (defaults 0-100). Pass null for indeterminate. */
  value?: number | null
  indicatorClassName?: string
}) {
  const degenerate = !(max > min)
  const clamped =
    !degenerate && typeof value === "number" && Number.isFinite(value)
      ? Math.min(Math.max(value, min), max)
      : null
  const ratio =
    clamped === null || degenerate ? null : (clamped - min) / (max - min)

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("flex w-full items-center", className)}
      value={clamped}
      min={min}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="h-2 w-full overflow-hidden rounded-full bg-primary/20"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "h-full w-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none data-indeterminate:animate-pulse",
            indicatorClassName
          )}
          // Base UI injects inline { insetInlineStart, height: inherit, width: % };
          // merged styles let our explicit keys win, replacing the percent width
          // with a full-width element scaled on the x axis.
          style={
            ratio === null
              ? undefined
              : { width: "100%", transform: `scaleX(${ratio})` }
          }
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
