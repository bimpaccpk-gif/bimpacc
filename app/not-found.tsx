import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Page not found — ${APP_NAME}`,
};

/**
 * Route-level 404. Renders inside the root layout (see the bundled Next.js
 * not-found.md doc), so it stays a plain Server Component and uses the same
 * `buttonVariants`-on-`Link` idiom as the rest of the app's server pages.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div
        aria-hidden="true"
        className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg font-bold"
      >
        B
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      </div>

      <Link href="/" className={buttonVariants({ variant: "default" })}>
        Back home
      </Link>
    </div>
  );
}
