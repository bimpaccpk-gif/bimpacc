"use client";

import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import "./globals.css";

/**
 * Root-level error boundary. Unlike route `error.tsx` files this replaces the
 * root layout entirely, so it must render its own <html> / <body> and pull in
 * the global stylesheet itself (see the bundled Next.js error.md doc).
 *
 * Deliberately dependency-light — only globals.css tokens and the cva-based
 * button variants are used, so this still renders when the rest of the app
 * fails to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // global-error must include html and body tags
    <html lang="en" className="h-full antialiased">
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
          <div aria-hidden="true" className="rounded-xl bg-destructive/10 p-3">
            <TriangleAlertIcon className="size-8 text-destructive" />
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              An unexpected error occurred. It has been logged.
            </p>
          </div>

          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
          ) : null}

          <button type="button" className={buttonVariants({ variant: "outline" })} onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
