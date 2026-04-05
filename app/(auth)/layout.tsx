import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="from-primary/20 via-background to-background dark:from-primary/10 dark:via-background dark:to-background absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]" />
      <div className="bg-primary/20 dark:bg-primary/10 absolute -top-[10%] -left-[20%] h-[800px] w-[800px] animate-[pulse_8s_ease-in-out_infinite] rounded-full blur-[120px]" />
      <div className="bg-primary/20 dark:bg-primary/10 absolute -right-[20%] -bottom-[10%] h-[800px] w-[800px] animate-[pulse_12s_ease-in-out_infinite] rounded-full blur-[120px]" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:24px_24px]" />

      {/* Content */}
      <div className="animate-in slide-in-from-bottom-8 fade-in fill-mode-both relative z-10 w-full max-w-md px-6 duration-1000">
        {/* Logo */}
        <Link
          href="/"
          className="group mb-8 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <div className="from-primary to-primary/80 text-primary-foreground shadow-primary/25 group-hover:shadow-primary/40 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold shadow-xl transition-all">
            B
          </div>
          <span className="from-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {/* Form Card */}
        <div className="border-background/20 bg-background/60 dark:bg-card/60 dark:shadow-primary/10 relative overflow-hidden rounded-[2rem] border p-8 shadow-2xl backdrop-blur-xl dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent" />
          <div className="relative z-10">{children}</div>
        </div>

        {/* Footer */}
        <p className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-muted-foreground/50 hover:text-muted-foreground mt-8 text-center text-xs font-medium transition-colors delay-500 duration-1000">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
