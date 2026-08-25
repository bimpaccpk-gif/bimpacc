import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Loading placeholder for the admin users screen (see users-table.tsx):
 * toolbar row (search input + three filter selects) followed by the
 * 8-column user grid. Server-component compatible — pure markup.
 */

const ROW_COUNT = 8;

// Deterministic width variation so the grid doesn't read as a uniform block.
const NAME_WIDTHS = ["w-24", "w-32", "w-28"] as const;
const EMAIL_WIDTHS = ["w-40", "w-48", "w-36"] as const;
const STATUS_WIDTHS = ["w-24", "w-28", "w-20"] as const;
const COURSE_WIDTHS = ["w-16", "w-20", "w-14"] as const;
const ROLE_WIDTHS = ["w-28", "w-24", "w-32"] as const;

const HEADER_WIDTHS = [
  "w-6",
  "w-20",
  "w-12",
  "w-32",
  "w-24",
  "w-12",
  "w-16",
  "w-14",
] as const;

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length]!;
}

function UserCellSkeleton({ rowIndex }: { rowIndex: number }) {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <Skeleton className={cn("h-4", pick(NAME_WIDTHS, rowIndex))} />
    </div>
  );
}

function ActionsCellSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-7 w-20 rounded-lg" />
      <Skeleton className="size-7 rounded-lg" />
    </div>
  );
}

export function UsersTableSkeleton() {
  return (
    <div data-slot="users-table-skeleton" aria-hidden="true" aria-busy="true">
      {/* Toolbar: search input + role / approval / onboarding filters */}
      <div data-slot="users-table-skeleton-toolbar" className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-full max-w-sm" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-8 w-52 rounded-lg" />
        </div>
      </div>

      {/* User grid */}
      <Table data-slot="users-table-skeleton-table">
        <TableHeader>
          <TableRow>
            {HEADER_WIDTHS.map((width, index) => (
              <TableHead key={index}>
                <Skeleton className={cn("h-3", width)} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: ROW_COUNT }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {/* Checkbox */}
              <TableCell>
                <Skeleton className="size-4 rounded-sm" />
              </TableCell>
              {/* User */}
              <TableCell>
                <UserCellSkeleton rowIndex={rowIndex} />
              </TableCell>
              {/* Email */}
              <TableCell>
                <Skeleton className={cn("h-4", pick(EMAIL_WIDTHS, rowIndex))} />
              </TableCell>
              {/* Status / Approval */}
              <TableCell>
                <Skeleton className={cn("h-5 rounded-md", pick(STATUS_WIDTHS, rowIndex))} />
              </TableCell>
              {/* Enrolled Courses */}
              <TableCell>
                <Skeleton className={cn("h-5 rounded-md", pick(COURSE_WIDTHS, rowIndex))} />
              </TableCell>
              {/* Role */}
              <TableCell>
                <Skeleton className={cn("h-6 rounded-md", pick(ROLE_WIDTHS, rowIndex))} />
              </TableCell>
              {/* Joined */}
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              {/* Actions */}
              <TableCell>
                <ActionsCellSkeleton />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination bar placeholder keeps the layout height stable */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-[74px] rounded-lg" />
          <Skeleton className="h-7 w-[62px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
