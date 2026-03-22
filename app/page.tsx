import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { GraduationCap, Clock, Award, Code, Users, BarChart3 } from "lucide-react";

export default function HomePage() {
  const features = [
    {
      title: "Expert Instructors",
      description: "Learn from industry professionals with real-world experience and proven track records.",
      icon: GraduationCap,
    },
    {
      title: "Flexible Learning",
      description: "Study at your own pace with lifetime access to courses and materials on any device.",
      icon: Clock,
    },
    {
      title: "Certificates",
      description: "Earn verified certificates upon course completion to showcase your new skills.",
      icon: Award,
    },
    {
      title: "Interactive Content",
      description: "Engage with hands-on projects, quizzes, and coding exercises for better retention.",
      icon: Code,
    },
    {
      title: "Community",
      description: "Connect with fellow learners and instructors in our vibrant learning community.",
      icon: Users,
    },
    {
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed analytics and progress reports.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 py-24 dark:from-blue-900 dark:to-indigo-950">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Learn Without Limits
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
                {APP_DESCRIPTION}. Access thousands of courses taught by industry experts
                and take your skills to the next level.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Why Choose {APP_NAME}?
              </h2>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                Everything you need to succeed in your learning journey
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 shadow-none">
                  <CardContent className="pt-6">
                    <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-50 py-20 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-blue-600 px-6 py-16 text-center dark:bg-blue-800 sm:px-16">
              <h2 className="text-3xl font-bold text-white">
                Ready to Start Learning?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
                Join thousands of learners who are already advancing their careers with {APP_NAME}.
              </p>
              <div className="mt-8">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                B
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {APP_NAME}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
