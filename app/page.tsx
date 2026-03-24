import { Navbar } from "@/components/layout/navbar";
import { 
  Hero, 
  Testimonials, 
  LearningPath, 
  CTA, 
  Footer 
} from "@/components/home";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

export default async function HomePage() {
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
    <div className="flex min-h-screen flex-col">
      {/* Skip to main content link for accessibility */}
      <a 
        href="#main" 
        className="skip-link"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <Navbar showLinks={true} />

      {/* Main Content */}
      <main id="main" className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Learning Path / Roadmap Section */}
        <LearningPath />

        {/* Testimonials Section */}
        <Testimonials />

        {/* CTA Section */}
        <CTA />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
