"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TESTIMONIALS } from "@/lib/constants";
import { Quote, ArrowRight, Linkedin, Twitter, Github } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Testimonials() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Quote className="h-4 w-4" />
            <span>Success Stories</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by BIM Professionals
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of professionals who have advanced their careers 
            in Building Information Modeling with BIMPACC LMS certifications.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className={`scroll-animate visible animate-fadeInUp stagger-${index + 1}`}
              style={{ opacity: 1 }}
            >
              <div className="h-full rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover">
                {/* Quote Icon */}
                <div className="mb-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Quote className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Quote Content */}
                <blockquote className="mb-6 text-lg text-foreground">
                  "{testimonial.content}"
                </blockquote>

                {/* Author Info */}
                <div className="flex items-center gap-4 border-t pt-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 rounded-2xl border bg-card p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Share Your Success Story
          </h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Have you advanced your career with BIMPACC LMS? We'd love to hear your story 
            and potentially feature it on our website.
          </p>
          <Link href="/contact">
            <Button className="gap-2">
              Get in Touch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
