import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the student dashboard (see student/page.tsx): welcome header,
 * four stat tiles, then a three-column grid of course cards with aspect-video
 * covers, description lines, a progress bar and a full-width action button.
 */

function StatTileSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-12" />
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      {/* Thumbnail cover */}
      <Skeleton className="aspect-[16/6] w-full rounded-none" />

      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      {/* Welcome header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Stat tiles: Enrolled / Available / In progress / Completed */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>

      {/* Enrolled courses */}
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CourseCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
