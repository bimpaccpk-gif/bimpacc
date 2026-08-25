import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the profile page (see profile/page.tsx): page header, then the
 * three-column grid — a centered identity card, a wide account-details card
 * with bordered info fields, full-width detail sections, and a stats card.
 */

function InfoFieldSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Skeleton className="size-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

function DetailSectionSkeleton({ fields }: { fields: number }) {
  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 md:col-span-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: fields }).map((_, index) => (
          <InfoFieldSkeleton key={index} />
        ))}
      </dl>
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 md:col-span-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-4">
            <Skeleton className="mx-auto h-8 w-12" />
            <Skeleton className="mx-auto mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-in fade-in space-y-8 duration-300">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Identity card */}
        <div className="flex flex-col items-center rounded-xl bg-card px-6 py-8 ring-1 ring-foreground/10 md:col-span-1">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="mt-4 h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-3 h-6 w-20 rounded-full" />
        </div>

        {/* Account details card */}
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10 md:col-span-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <InfoFieldSkeleton key={index} />
            ))}
          </dl>
        </div>

        {/* Full-width detail sections (personal / academic / contact / fees) */}
        <DetailSectionSkeleton fields={3} />
        <DetailSectionSkeleton fields={3} />

        {/* Role stats */}
        <StatsCardSkeleton />
      </div>
    </div>
  );
}
