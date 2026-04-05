"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, BookOpen, Award, CheckCircle2, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="from-primary/5 via-background to-primary/10 absolute inset-0 bg-gradient-to-br" />

      {/* Decorative Blobs */}
      <div className="bg-primary/20 animate-pulse-subtle absolute top-20 left-10 h-72 w-72 rounded-full blur-3xl" />
      <div
        className="bg-primary/10 animate-pulse-subtle absolute right-10 bottom-20 h-96 w-96 rounded-full blur-3xl"
        style={{ animationDelay: "1s" }}
      />

      {/* Grid Pattern */}
      <div className="bg-grid-pattern absolute inset-0 opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="animate-fadeInUp inline-flex" style={{ animationDelay: "0ms" }}>
              <div className="border-primary/20 bg-primary/5 text-primary inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Start learning today</span>
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-foreground animate-fadeInUp text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "100ms" }}
            >
              Master BIM Skills &{" "}
              <span className="from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-transparent">
                Advance Your Career
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-muted-foreground animate-fadeInUp max-w-xl text-lg"
              style={{ animationDelay: "200ms" }}
            >
              Build industry-recognized BIM skills with hands-on courses designed by experts. From
              BIM modeling to construction management, chart your path to success.
            </p>

            {/* CTA Buttons */}
            <div
              className="animate-fadeInUp flex flex-col gap-4 sm:flex-row"
              style={{ animationDelay: "300ms" }}
            >
              <Link href="/register">
                <Button size="lg" className="h-11 w-full gap-2 px-6 sm:w-auto">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="h-11 w-full gap-2 px-6 sm:w-auto">
                  <Play className="h-4 w-4" />
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Hero Card */}
          <div
            className="animate-scaleIn relative hidden lg:block"
            style={{ animationDelay: "300ms" }}
          >
            <div className="relative mx-auto max-w-md">
              {/* Main Card */}
              <div className="bg-card rounded-2xl border p-6 shadow-2xl">
                {/* Course Progress Card */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                    <BookOpen className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">BIM Modeling</p>
                    <p className="text-muted-foreground text-sm">Advanced Certification</p>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="from-primary/20 to-primary/5 mb-4 rounded-xl bg-gradient-to-br p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-foreground text-sm font-medium">Course Progress</span>
                    <span className="text-primary text-sm font-bold">75%</span>
                  </div>
                  <div className="bg-primary/20 h-3 overflow-hidden rounded-full">
                    <div className="from-primary to-primary/60 h-full w-3/4 rounded-full bg-gradient-to-r" />
                  </div>
                  <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
                    <span>12 of 16 lessons completed</span>
                    <span>4 lessons remaining</span>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                  <p className="text-foreground text-sm font-medium">Recent Activity</p>
                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2">
                    <CheckCircle2 className="text-success h-5 w-5" />
                    <span className="text-foreground text-sm">Completed: Revit Advanced</span>
                  </div>
                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-2">
                    <Zap className="text-warning h-5 w-5" />
                    <span className="text-foreground text-sm">Earned +150 XP</span>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div
                className="animate-slideInLeft glass absolute top-20 -left-8 rounded-xl p-4 shadow-lg"
                style={{ animationDelay: "600ms" }}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-success flex h-10 w-10 items-center justify-center rounded-full">
                    <CheckCircle2 className="text-primary-foreground h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Course Completed!</p>
                    <p className="text-muted-foreground text-xs">Revit Architecture</p>
                  </div>
                </div>
              </div>

              <div
                className="animate-slideInRight glass absolute -right-4 bottom-32 rounded-xl p-4 shadow-lg"
                style={{ animationDelay: "800ms" }}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-warning flex h-10 w-10 items-center justify-center rounded-full">
                    <Zap className="text-primary-foreground h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">+500 XP</p>
                    <p className="text-muted-foreground text-xs">Level Up!</p>
                  </div>
                </div>
              </div>

              <div
                className="animate-float glass absolute bottom-8 -left-4 rounded-xl p-4 shadow-lg"
                style={{ animationDelay: "1000ms" }}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
                    <Award className="text-primary-foreground h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Certificate Earned!</p>
                    <p className="text-muted-foreground text-xs">BIM Coordination</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
