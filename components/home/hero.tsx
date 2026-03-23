"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Sparkles, 
  Play, 
  BookOpen,
  Award,
  CheckCircle2,
  Zap
} from "lucide-react";


export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      {/* Decorative Blobs */}
      <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse-subtle" />
      <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse-subtle" style={{ animationDelay: "1s" }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex animate-fadeInUp" style={{ animationDelay: "0ms" }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Start learning today</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fadeInUp" style={{ animationDelay: "100ms" }}>
              Master BIM Skills &{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Advance Your Career
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="max-w-xl text-lg text-muted-foreground animate-fadeInUp" style={{ animationDelay: "200ms" }}>
              Build industry-recognized BIM skills with hands-on courses designed by experts. 
              From BIM modeling to construction management, chart your path to success.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row animate-fadeInUp" style={{ animationDelay: "300ms" }}>
              <Link href="/register">
                <Button size="lg" className="w-full gap-2 sm:w-auto h-11 px-6">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto h-11 px-6">
                  <Play className="h-4 w-4" />
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Content - Hero Card */}
          <div className="relative hidden lg:block animate-scaleIn" style={{ animationDelay: "300ms" }}>
            <div className="relative mx-auto max-w-md">
              {/* Main Card */}
              <div className="rounded-2xl border bg-card p-6 shadow-2xl">
                {/* Course Progress Card */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">BIM Modeling</p>
                    <p className="text-sm text-muted-foreground">Advanced Certification</p>
                  </div>
                </div>
                
                {/* Progress Visual */}
                <div className="mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Course Progress</span>
                    <span className="text-sm font-bold text-primary">75%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-primary/20">
                    <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-primary to-primary/60" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>12 of 16 lessons completed</span>
                    <span>4 lessons remaining</span>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Recent Activity</p>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-foreground">Completed: Revit Advanced</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span className="text-sm text-foreground">Earned +150 XP</span>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -left-8 top-20 animate-slideInLeft glass rounded-xl p-4 shadow-lg" style={{ animationDelay: "600ms" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Course Completed!</p>
                    <p className="text-xs text-muted-foreground">Revit Architecture</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-32 animate-slideInRight glass rounded-xl p-4 shadow-lg" style={{ animationDelay: "800ms" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">+500 XP</p>
                    <p className="text-xs text-muted-foreground">Level Up!</p>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 bottom-8 animate-float glass rounded-xl p-4 shadow-lg" style={{ animationDelay: "1000ms" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Certificate Earned!</p>
                    <p className="text-xs text-muted-foreground">BIM Coordination</p>
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
