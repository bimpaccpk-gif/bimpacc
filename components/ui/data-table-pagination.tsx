import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

/**
 * Server-compatible pagination bar — no client JS. Prev/next render as plain
 * `<a>` links styled with the outline button variants; out-of-range controls
 * degrade to a non-interactive `<span aria-disabled="true">` so pages never
 * need to hydrate this component.
 */

interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  getPageHref: (page: number) => string
  className?: string
}

function DataTablePagination({
  page,
  pageSize,
  total,
  getPageHref,
  className,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(total, currentPage * pageSize)
  const hasPrevious = currentPage > 1
  const hasNext = currentPage < totalPages

  const controlClassName = buttonVariants({ variant: "outline", size: "sm" })

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "flex flex-col-reverse items-center gap-2 py-2 sm:flex-row sm:justify-between",
        className
      )}
    >
      <p
        data-slot="data-table-pagination-range"
        className="text-xs text-muted-foreground tabular-nums"
      >
        {start}–{end} of {total}
      </p>
      <div data-slot="data-table-pagination-controls" className="flex items-center gap-2">
        {hasPrevious ? (
          <a
            href={getPageHref(currentPage - 1)}
            data-slot="data-table-pagination-previous"
            aria-label="Go to previous page"
            className={controlClassName}
          >
            <ChevronLeftIcon aria-hidden="true" />
            Previous
          </a>
        ) : (
          <span
            aria-disabled="true"
            data-slot="data-table-pagination-previous"
            className={cn(controlClassName, "pointer-events-none opacity-50")}
          >
            <ChevronLeftIcon aria-hidden="true" />
            Previous
          </span>
        )}
        {hasNext ? (
          <a
            href={getPageHref(currentPage + 1)}
            data-slot="data-table-pagination-next"
            aria-label="Go to next page"
            className={controlClassName}
          >
            Next
            <ChevronRightIcon aria-hidden="true" />
          </a>
        ) : (
          <span
            aria-disabled="true"
            data-slot="data-table-pagination-next"
            className={cn(controlClassName, "pointer-events-none opacity-50")}
          >
            Next
            <ChevronRightIcon aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  )
}

export { DataTablePagination }
