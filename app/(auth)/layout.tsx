import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-background to-brand-600/20 dark:from-brand-500/10 dark:to-brand-900/10" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl dark:bg-brand-500/10" />
      <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl dark:bg-brand-600/10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
            B
          </div>
          <span className="text-xl font-bold tracking-tight">
            {APP_NAME}
          </span>
        </Link>

        {/* Form Card */}
        <div className="rounded-2xl border bg-card/80 p-8 shadow-xl backdrop-blur-sm">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
