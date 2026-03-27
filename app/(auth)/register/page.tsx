import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, batch")
    .eq("registration_open", true)
    .order("created_at", { ascending: false });

  return <RegisterForm courses={courses || []} />;
}
