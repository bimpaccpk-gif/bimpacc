export default function Loading() {
  return (
    <div className="animate-in fade-in space-y-6 duration-300">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-muted h-4 w-12 animate-pulse rounded dark:bg-zinc-800" />
          <div className="flex items-center gap-4">
            <div className="bg-muted h-16 w-16 animate-pulse rounded-full dark:bg-zinc-800" />
            <div className="space-y-2">
              <div className="bg-muted h-6 w-48 animate-pulse rounded dark:bg-zinc-800" />
              <div className="bg-muted h-4 w-56 animate-pulse rounded dark:bg-zinc-800" />
              <div className="flex gap-2">
                <div className="bg-muted h-5 w-16 animate-pulse rounded dark:bg-zinc-800" />
                <div className="bg-muted h-5 w-20 animate-pulse rounded dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-8 w-28 animate-pulse rounded dark:bg-zinc-800" />
          <div className="bg-muted h-8 w-20 animate-pulse rounded dark:bg-zinc-800" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="bg-muted h-4 w-24 animate-pulse rounded dark:bg-zinc-800" />
              <div className="bg-muted h-5 w-5 animate-pulse rounded dark:bg-zinc-800" />
            </div>
            <div className="bg-muted mt-4 h-7 w-16 animate-pulse rounded dark:bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="bg-muted mb-4 h-5 w-40 animate-pulse rounded dark:bg-zinc-800" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="bg-muted h-4 w-28 animate-pulse rounded dark:bg-zinc-800" />
                  <div className="bg-muted h-4 w-36 animate-pulse rounded dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <div className="bg-muted mb-4 h-5 w-48 animate-pulse rounded dark:bg-zinc-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="bg-muted h-4 flex-1 animate-pulse rounded dark:bg-zinc-800" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded dark:bg-zinc-800" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded dark:bg-zinc-800" />
              <div className="bg-muted h-4 w-32 animate-pulse rounded dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
