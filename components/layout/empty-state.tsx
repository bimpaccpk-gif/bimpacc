import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Centered placeholder for empty lists/collections. Server-compatible — no
 * hooks, no state.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      {Icon ? (
        <div
          data-slot="empty-state-icon"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted"
        >
          <Icon aria-hidden="true" className="size-6 text-muted-foreground" />
        </div>
      ) : null}

      <div data-slot="empty-state-title" className="mt-3 text-sm font-semibold">
        {title}
      </div>

      {description ? (
        <p
          data-slot="empty-state-description"
          className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground"
        >
          {description}
        </p>
      ) : null}

      {action ? (
        <div data-slot="empty-state-action" className="mt-4">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
