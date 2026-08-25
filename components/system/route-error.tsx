"use client";

import * as React from "react";
import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shared route-segment error UI, rendered by the `error.tsx` boundaries under
 * app/(auth) and app/(dashboard). Logs the error once per error instance and
 * offers a retry wired to the boundary's `reset`.
 */
function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div aria-hidden="true" className="rounded-xl bg-destructive/10 p-3">
        <TriangleAlertIcon className="size-8 text-destructive" />
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. It has been logged.
        </p>
      </div>

      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
      ) : null}

      <Button variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}

export { RouteError };
