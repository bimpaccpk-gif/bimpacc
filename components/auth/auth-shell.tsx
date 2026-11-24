import Link from "next/link";
import { CircleCheckIcon, PlayCircleIcon, ShieldCheckIcon, type LucideIcon } from "lucide-react";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

/** Only real product features; no marketing claims. */
const FEATURES: Array<{ icon: LucideIcon; text: string }> = [
  { icon: PlayCircleIcon, text: "Video lessons, quizzes and certificates" },
  { icon: CircleCheckIcon, text: "Pick up exactly where you left off" },
  { icon: ShieldCheckIcon, text: "Every account protected with two-step verification" },
];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={
          inverted
            ? "bg-primary-foreground text-primary flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold"
            : "bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold"
        }
        aria-hidden="true"
      >
        B
      </span>
      <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  );
}

/**
 * Split layout for sign-in, registration and two-step verification:
 * brand panel on large screens, the form column everywhere.
 * Server-compatible — no hooks, no state.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-2">
      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.06)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top_left,#000_30%,transparent_75%)] bg-[size:32px_32px]"
        />
        <Link href="/login" className="relative w-fit">
          <Logo inverted />
        </Link>

        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">{APP_DESCRIPTION}.</h2>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="text-primary-foreground/85 flex items-center gap-3 text-sm">
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-primary-foreground/60 relative text-xs">
          &copy; {year} {APP_NAME}
        </p>
      </aside>

      <main className="flex min-h-screen flex-col px-4 py-8 sm:px-8">
        <Link href="/login" className="w-fit lg:hidden">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-muted-foreground text-center text-xs lg:hidden">
          &copy; {year} {APP_NAME}
        </p>
      </main>
    </div>
  );
}

/** Title block used at the top of every auth form. */
export function AuthHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
    </div>
  );
}
