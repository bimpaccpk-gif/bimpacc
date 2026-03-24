import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const role = (profile.role as UserRole) ?? "student";
      redirect(`/${role}`);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-background to-background dark:from-indigo-500/10 dark:via-background dark:to-background" />
      <div className="absolute -left-[20%] -top-[10%] h-[800px] w-[800px] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-500/10" />
      <div className="absolute -bottom-[10%] -right-[20%] h-[800px] w-[800px] animate-[pulse_12s_ease-in-out_infinite] rounded-full bg-purple-600/20 blur-[120px] dark:bg-purple-600/10" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 fill-mode-both">
        {/* Logo */}
        <Link
          href="/"
          className="group mb-8 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-xl shadow-indigo-500/25 transition-all group-hover:shadow-indigo-500/40">
            B
          </div>
          <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {/* Form Card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/60 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/60 dark:shadow-purple-900/10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent" />
          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-both text-center text-xs font-medium text-muted-foreground/50 transition-colors hover:text-muted-foreground">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
