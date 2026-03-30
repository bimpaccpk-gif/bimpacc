export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-muted dark:bg-zinc-800" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted dark:bg-zinc-800 mx-auto" />
      </div>
    </div>
  );
}
