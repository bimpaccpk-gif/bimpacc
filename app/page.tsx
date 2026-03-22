import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  APP_NAME,
  APP_DESCRIPTION,
  APP_TAGLINE,
  FOOTER_LINKS,
} from "@/lib/constants";
import {
  GraduationCap,
  Clock,
  Award,
  Code,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      title: "Expert Instructors",
      description:
        "Learn from industry professionals with real-world experience and proven track records.",
      icon: GraduationCap,
    },
    {
      title: "Flexible Learning",
      description:
        "Study at your own pace with lifetime access to courses and materials on any device.",
      icon: Clock,
    },
    {
      title: "Certificates",
      description:
        "Earn verified certificates upon course completion to showcase your new skills.",
      icon: Award,
    },
    {
      title: "Interactive Content",
      description:
        "Engage with hands-on projects, quizzes, and coding exercises for better retention.",
      icon: Code,
    },
    {
      title: "Community",
      description:
        "Connect with fellow learners and instructors in our vibrant learning community.",
      icon: Users,
    },
    {
      title: "Progress Tracking",
      description:
        "Monitor your learning journey with detailed analytics and progress reports.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar showLinks={false} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 py-24 dark:from-brand-500 dark:to-brand-700">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {APP_TAGLINE}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
                {APP_DESCRIPTION}. Access thousands of courses taught by industry
                experts and take your skills to the next level.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-white text-brand-700 hover:bg-brand-50 dark:bg-brand-400 dark:text-brand-950 dark:hover:bg-brand-300"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="border border-white text-white hover:bg-white/10"
                  >
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>


        {/* Features Section */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground">
                Why Choose {APP_NAME}?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Everything you need to succeed in your learning journey
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="border-0 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-16 text-center dark:from-brand-500 dark:to-brand-700 sm:px-16">
              <h2 className="text-3xl font-bold text-white">
                Ready to Start Learning?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
                Join thousands of learners who are already advancing their
                careers with {APP_NAME}.
              </p>
              <div className="mt-8">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-white text-brand-700 hover:bg-brand-50 dark:bg-brand-400 dark:text-brand-950 dark:hover:bg-brand-300"
                  >
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-surface-sunken">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                  B
                </div>
                <span className="text-lg font-semibold text-foreground">
                  {APP_NAME}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Empowering learners worldwide with quality education and
                industry-relevant skills.
              </p>
            </div>

            {FOOTER_LINKS.map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-foreground">{group.title}</h3>
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t pt-8">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
