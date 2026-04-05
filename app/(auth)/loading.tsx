export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="bg-muted dark:bg-muted-foreground/10 mx-auto h-12 w-12 animate-pulse rounded-full" />
        <div className="bg-muted dark:bg-muted-foreground/10 mx-auto h-4 w-32 animate-pulse rounded" />
      </div>
    </div>
  );
}
