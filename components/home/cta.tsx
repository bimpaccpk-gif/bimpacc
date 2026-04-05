"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main CTA Banner */}
        <div className="from-primary via-primary to-primary/80 relative overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-16 sm:px-12 lg:px-16">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/10 blur-3xl" />

          {/* Grid Pattern Overlay */}
          <div className="bg-grid-pattern absolute inset-0 opacity-10" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-primary-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Ready to Accelerate Your Engineering Career?
            </h2>
            <p className="text-primary-foreground/80 mt-6 text-lg sm:text-xl">
              Join 1,000+ engineers who have transformed their careers with BIMPACC LMS. Start
              building industry-relevant skills today.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 gap-2 px-8 text-base font-semibold"
                >
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Rating */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="fill-warning text-warning h-5 w-5" />
                ))}
              </div>
              <span className="text-primary-foreground/80 text-sm">
                Rated 4.9/5 from 1,000+ reviews
              </span>
            </div>
          </div>
        </div>

        {/* Secondary CTA - Corporate */}
        <div className="bg-card mt-8 rounded-2xl border p-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="text-center md:text-left">
              <h3 className="text-foreground text-xl font-semibold">
                Looking for Enterprise Solutions?
              </h3>
              <p className="text-muted-foreground mt-2">
                Train your team with customized learning paths and dedicated support.
              </p>
            </div>
            <Link href="/business">
              <Button variant="outline" size="lg" className="gap-2">
                Contact Sales
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
