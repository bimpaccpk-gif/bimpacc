import { UsersTableSkeleton } from "@/components/admin/users-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the admin user-management page (see admin/users/page.tsx):
 * header row with a primary action, four stat tiles, then the users table
 * (toolbar + wide grid) reused from components/admin/users-table-skeleton.
 */

function StatTileSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-5" />
      </div>
      <Skeleton className="h-7 w-12" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* Header row: title/description on the left, "Add user" action on the right */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-36 shrink-0 rounded-lg" />
      </div>

      {/* Stat tiles: Total users / Instructors / Students / Pending review */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>

      {/* Users table */}
      <UsersTableSkeleton />
    </div>
  );
}
