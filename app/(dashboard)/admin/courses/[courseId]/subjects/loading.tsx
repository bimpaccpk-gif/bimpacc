export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted dark:bg-muted-foreground/10" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted dark:bg-muted-foreground/10" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted dark:bg-muted-foreground/10" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-muted dark:bg-muted-foreground/10" />
            </div>
            <div className="mt-4 h-7 w-16 animate-pulse rounded bg-muted dark:bg-muted-foreground/10" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted dark:bg-muted-foreground/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted dark:bg-muted-foreground/10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted dark:bg-muted-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
