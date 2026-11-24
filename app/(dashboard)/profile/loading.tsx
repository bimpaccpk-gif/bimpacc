import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for profile/page.tsx: header, identity card, stat row, details card. */
export default function Loading() {
  return (
    <div className="animate-in fade-in mx-auto w-full max-w-4xl space-y-6 duration-300">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="bg-card ring-foreground/10 flex items-center gap-4 rounded-xl p-5 ring-1">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-60 max-w-full" />
          <Skeleton className="h-5 w-32 rounded-full" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card ring-foreground/10 space-y-3 rounded-xl p-5 ring-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="bg-card ring-foreground/10 divide-border divide-y rounded-xl ring-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
