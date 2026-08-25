import * as React from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * Server-driven data grid.
 *
 * Deliberately dumb and server-component compatible: no hooks, no client state,
 * no TanStack. Sorting/pagination are URL-driven — pages compute `getSortHref`
 * / `getPageHref` from their own searchParams and this component just renders
 * plain `<a>` links, so a click is a normal navigation.
 *
 * Sticky headers need a scrolling ancestor: pass className to override the
 * default overflow wrapper, e.g. `<DataTable className="max-h-[70vh] overflow-y-auto" stickyHeader />`.
 */

export interface DataTableColumn {
  key: string
  header: React.ReactNode
  sortable?: boolean
  /** Query param value passed to getSortHref; required for sortable columns. */
  sortKey?: string
  /** Applied to both the head and every cell in the column (e.g. w-12, text-right). */
  className?: string
  align?: "left" | "right"
}

export interface DataTableRow {
  id: string
  cells: Record<string, React.ReactNode>
}

/** The sort currently applied by the page (mirrors its searchParams). */
export interface DataTableSortState {
  sortKey: string
  desc: boolean
}

interface DataTableProps {
  columns: DataTableColumn[]
  rows: DataTableRow[]
  emptyState?: React.ReactNode
  stickyHeader?: boolean
  /**
   * Builds the href for a sortable header link. `currentDesc` is the direction
   * that column is sorted in right now — true = descending, false = ascending,
   * null = not currently sorted — so pages can cycle asc → desc → unsorted.
   */
  getSortHref?: (sortKey: string, currentDesc: boolean | null) => string
  /** Feeds `currentDesc` into getSortHref and sets aria-sort on the active head. */
  currentSort?: DataTableSortState
  className?: string
}

function DataTable({
  columns,
  rows,
  emptyState,
  stickyHeader = false,
  getSortHref,
  currentSort,
  className,
}: DataTableProps) {
  return (
    <div data-slot="data-table" className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const isActive =
                !!column.sortable &&
                !!column.sortKey &&
                currentSort?.sortKey === column.sortKey
              const currentDesc = isActive ? currentSort.desc : null

              return (
                <TableHead
                  key={column.key}
                  aria-sort={
                    isActive ? (currentSort.desc ? "descending" : "ascending") : undefined
                  }
                  className={cn(
                    column.align === "right" && "text-right",
                    stickyHeader && "sticky top-0 z-10 border-b bg-card",
                    column.className
                  )}
                >
                  {column.sortable && column.sortKey && getSortHref ? (
                    <a
                      href={getSortHref(column.sortKey, currentDesc)}
                      data-slot="data-table-sort-link"
                      className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {column.header}
                      {isActive ? (
                        currentSort.desc ? (
                          <ArrowDownIcon
                            aria-hidden="true"
                            className="ml-1 inline size-3.5"
                          />
                        ) : (
                          <ArrowUpIcon aria-hidden="true" className="ml-1 inline size-3.5" />
                        )
                      ) : (
                        <ArrowUpDownIcon
                          aria-hidden="true"
                          className="ml-1 inline size-3.5 opacity-50"
                        />
                      )}
                    </a>
                  ) : (
                    column.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={columns.length}>{emptyState ?? "No results."}</TableEmpty>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} data-slot="data-table-row">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.className
                    )}
                  >
                    {row.cells[column.key] ?? null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function DataTableToolbar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    />
  )
}

export { DataTable, DataTableToolbar }
