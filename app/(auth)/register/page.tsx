import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/auth/register-form";
import { GoogleRegistration } from "@/components/auth/google-registration";
import { isPasswordAuthEnabled } from "@/lib/auth-config";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, batch")
    .eq("registration_open", true)
    .order("created_at", { ascending: false });

  // Production: Google only (the course is chosen first, then carried through OAuth).
  if (!isPasswordAuthEnabled()) {
    return <GoogleRegistration courses={courses || []} />;
  }

  return <RegisterForm courses={courses || []} />;
}
