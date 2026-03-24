import { Sparkles, Loader2 } from "lucide-react";

export default function AdminCoursesLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-muted dark:bg-zinc-800" />
          <div className="h-4 w-64 animate-pulse rounded-lg bg-muted dark:bg-zinc-800" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-lg bg-muted dark:bg-zinc-800" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-[24px] border border-border/50 bg-card/60 p-6 shadow-sm dark:bg-zinc-950/60"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
            
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2.5">
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-muted dark:bg-zinc-800" />
                <div className="h-4 w-full animate-pulse rounded-md bg-muted dark:bg-zinc-800" />
                <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted dark:bg-zinc-800" />
              </div>
              <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-muted dark:bg-zinc-800" />
            </div>

            {/* Badge */}
            <div className="mt-5 h-7 w-28 animate-pulse rounded-lg bg-muted dark:bg-zinc-800" />

            {/* Stats */}
            <div className="mt-5 flex items-center gap-4">
              <div className="h-4 w-20 animate-pulse rounded-md bg-muted dark:bg-zinc-800" />
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted dark:bg-zinc-800" />
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center gap-2">
              <div className="h-10 flex-1 animate-pulse rounded-xl bg-muted dark:bg-zinc-800" />
              <div className="h-10 w-10 animate-pulse rounded-xl bg-muted dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
