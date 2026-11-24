import { AuthShell } from "@/components/auth/auth-shell";
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
      .select("role, is_paused")
      .eq("id", user.id)
      .single();

    // A paused account is sent here by the proxy with ?error=account_paused. Redirecting it to
    // its dashboard would bounce straight back (redirect loop), so show the sign-in page instead.
    if (profile && !profile.is_paused) {
      const role = (profile.role as UserRole) ?? "student";
      if (role === "admin") {
        const { data: capability } = await supabase
          .from("super_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (capability) redirect("/super-admin");
      }
      redirect(`/${role}`);
    }
  }

  return <AuthShell>{children}</AuthShell>;
}
