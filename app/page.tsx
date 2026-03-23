import { Navbar } from "@/components/layout/navbar";
import { 
  Hero, 
  Testimonials, 
  LearningPath, 
  CTA, 
  Footer 
} from "@/components/home";

export default function HomePage() {
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
