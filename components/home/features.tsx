"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Clock,
  Award,
  Code,
  Users,
  BarChart3,
  ChevronRight,
  Shield,
  Globe,
  MessageSquare,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  link?: string;
}

const features: Feature[] = [
  {
    title: "Expert Instructors",
    description:
      "Learn from industry professionals with proven track records. All instructors are vetted and have real-world engineering experience.",
    icon: GraduationCap,
    color: "text-info",
    bg: "bg-info/10",
    link: "/instructors",
  },
  {
    title: "Flexible Learning",
    description:
      "Study at your own pace with lifetime access to all course materials. Learn on any device, anytime, anywhere.",
    icon: Clock,
    color: "text-success",
    bg: "bg-success/10",
    link: "/features/flexible-learning",
  },
  {
    title: "Industry Certifications",
    description:
      "Earn recognized certifications that employers trust. Boost your resume with verifiable credentials.",
    icon: Award,
    color: "text-warning",
    bg: "bg-warning/10",
    link: "/certifications",
  },
  {
    title: "Hands-on Projects",
    description:
      "Build real-world projects that showcase your skills. Create a portfolio that stands out to employers.",
    icon: Code,
    color: "text-primary",
    bg: "bg-primary/10",
    link: "/projects",
  },
  {
    title: "Community Support",
    description:
      "Join our active community of 50,000+ engineers. Get help, share knowledge, and network with peers.",
    icon: Users,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    link: "/community",
  },
  {
    title: "Progress Analytics",
    description:
      "Track your learning journey with detailed analytics. Monitor progress, identify gaps, and optimize your path.",
    icon: BarChart3,
    color: "text-primary",
    bg: "bg-primary/10",
    link: "/analytics",
  },
  {
    title: "Verified Credentials",
    description:
      "All certifications are verifiable and shareable on LinkedIn. Employers can instantly verify your achievements.",
    icon: Shield,
    color: "text-red-500",
    bg: "bg-red-500/10",
    link: "/credentials",
  },
  {
    title: "Global Access",
    description:
      "Access courses from anywhere in the world. Multi-language support and region-specific content available.",
    icon: Globe,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    link: "/global",
  },
  {
    title: "Career Services",
    description:
      "Get career guidance, resume reviews, and interview prep. We help you land your dream engineering role.",
    icon: MessageSquare,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    link: "/career",
  },
];

export function Features() {
  return (
    <section className="py-20" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="border-primary/20 bg-primary/5 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            <span>Why Choose Us</span>
          </div>
          <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Succeed
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Our platform is designed to give you the best learning experience possible, with
            features tailored for engineering professionals.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              href={feature.link || "#"}
              className={`group scroll-animate animate-fadeInUp visible stagger-${index + 1}`}
              style={{ opacity: 1 }}
            >
              <div className="bg-card shadow-card hover:border-primary/30 hover:shadow-card-hover h-full rounded-2xl border p-6 transition-all duration-300">
                {/* Icon */}
                <div className={`mb-4 inline-flex rounded-xl ${feature.bg} p-3`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>

                {/* Title */}
                <h3 className="text-foreground mb-2 text-xl font-semibold">{feature.title}</h3>

                {/* Description */}
                <p className="text-muted-foreground mb-4">{feature.description}</p>

                {/* Learn More Link */}
                <div className="text-primary flex items-center gap-1 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
                  Learn more
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
