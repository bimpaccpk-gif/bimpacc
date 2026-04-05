"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Building2,
  PenTool,
  Layers,
  Hammer,
  ArrowRight,
  CheckCircle2,
  Lock,
  Circle,
  Target,
  Rocket,
} from "lucide-react";

interface CareerPath {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  levels: {
    name: string;
    courses: number;
    duration: string;
    status: "completed" | "current" | "locked";
  }[];
  totalCourses: number;
  totalDuration: string;
}

const careerPaths: CareerPath[] = [
  {
    id: "bim-coordinator",
    title: "BIM Coordinator",
    icon: Building2,
    color: "text-info bg-info/10",
    totalCourses: 12,
    totalDuration: "24 weeks",
    levels: [
      { name: "BIM Assistant", courses: 3, duration: "6 weeks", status: "completed" },
      { name: "Junior BIM Coordinator", courses: 3, duration: "6 weeks", status: "completed" },
      { name: "BIM Coordinator", courses: 3, duration: "6 weeks", status: "current" },
      { name: "Senior BIM Coordinator", courses: 3, duration: "6 weeks", status: "locked" },
    ],
  },
  {
    id: "bim-modeler",
    title: "BIM Modeler",
    icon: PenTool,
    color: "text-success bg-success/10",
    totalCourses: 10,
    totalDuration: "20 weeks",
    levels: [
      { name: "Draftsman", courses: 2, duration: "4 weeks", status: "completed" },
      { name: "CAD Technician", courses: 3, duration: "6 weeks", status: "completed" },
      { name: "BIM Modeler", courses: 3, duration: "6 weeks", status: "current" },
      { name: "Senior BIM Modeler", courses: 2, duration: "4 weeks", status: "locked" },
    ],
  },
  {
    id: "architecture",
    title: "Architectural Design",
    icon: Layers,
    color: "text-info bg-info/10",
    totalCourses: 15,
    totalDuration: "30 weeks",
    levels: [
      { name: "Junior Architect", courses: 4, duration: "8 weeks", status: "completed" },
      { name: "Architect", courses: 4, duration: "8 weeks", status: "completed" },
      { name: "Senior Architect", courses: 4, duration: "8 weeks", status: "current" },
      { name: "Lead Architect", courses: 3, duration: "6 weeks", status: "locked" },
    ],
  },
  {
    id: "construction",
    title: "Construction Management",
    icon: Hammer,
    color: "text-warning bg-warning/10",
    totalCourses: 14,
    totalDuration: "28 weeks",
    levels: [
      { name: "Site Engineer", courses: 4, duration: "8 weeks", status: "completed" },
      { name: "Project Engineer", courses: 4, duration: "8 weeks", status: "current" },
      { name: "Construction Manager", courses: 3, duration: "6 weeks", status: "locked" },
      { name: "Senior Project Manager", courses: 3, duration: "6 weeks", status: "locked" },
    ],
  },
];

function PathCard({ path, stagger }: { path: CareerPath; stagger: string }) {
  return (
    <div className={`scroll-animate animate-fadeInUp visible ${stagger}`} style={{ opacity: 1 }}>
      <div className="bg-card shadow-card hover:shadow-card-hover rounded-2xl border p-6 transition-all duration-300">
        {/* Path Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${path.color}`}>
              <path.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-foreground text-xl font-semibold">{path.title}</h3>
              <p className="text-muted-foreground text-sm">
                {path.totalCourses} courses • {path.totalDuration}
              </p>
            </div>
          </div>
        </div>

        {/* Path Levels - Desktop (Horizontal) */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Progress Line */}
            <div className="bg-muted absolute top-8 left-6 h-1 w-[calc(100%-48px)]" />
            <div
              className="bg-primary absolute top-8 left-6 h-1 transition-all duration-500"
              style={{
                width: `${
                  (path.levels.filter((l) => l.status === "completed").length /
                    (path.levels.length - 1)) *
                  100
                }%`,
              }}
            />

            {/* Level Nodes */}
            <div className="flex justify-between">
              {path.levels.map((level, levelIndex) => (
                <div key={levelIndex} className="flex flex-col items-center">
                  {/* Node */}
                  <div
                    className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                      level.status === "completed"
                        ? "border-primary bg-primary text-primary-foreground"
                        : level.status === "current"
                          ? "border-primary bg-card animate-pulse-ring"
                          : "border-muted bg-card text-muted-foreground"
                    }`}
                  >
                    {level.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : level.status === "current" ? (
                      <Circle className="fill-primary h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-3 text-center">
                    <p
                      className={`text-sm font-medium ${
                        level.status === "locked" ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {level.name}
                    </p>
                    <p className="text-muted-foreground text-xs">{level.courses} courses</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Path Levels - Mobile (Vertical) */}
        <div className="space-y-4 lg:hidden">
          {path.levels.map((level, levelIndex) => (
            <div
              key={levelIndex}
              className={`flex items-center gap-4 rounded-lg p-3 ${
                level.status === "current" ? "bg-primary/5 border-primary/20 border" : ""
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  level.status === "completed"
                    ? "bg-primary text-primary-foreground"
                    : level.status === "current"
                      ? "bg-primary/20 text-primary border-primary border-2"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {level.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : level.status === "current" ? (
                  <Circle className="fill-primary h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    level.status === "locked" ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {level.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {level.courses} courses • {level.duration}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Path CTA */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Rocket className="text-primary h-4 w-4" />
            <span>
              {path.levels.filter((l) => l.status === "completed").length} of {path.levels.length}{" "}
              levels completed
            </span>
          </div>
          <Link href={`/paths/${path.id}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LearningPath() {
  return (
    <section className="py-20" id="paths">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="border-primary/20 bg-primary/5 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <Target className="h-4 w-4" />
            <span>Career Paths</span>
          </div>
          <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Your BIM Career Roadmap
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Follow structured learning paths designed to take you from entry-level to expert in
            Building Information Modeling. Master industry-standard tools and earn recognized
            certifications.
          </p>
        </div>

        {/* Career Paths Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          <PathCard path={careerPaths[0]} stagger="stagger-1" />
          <PathCard path={careerPaths[1]} stagger="stagger-2" />
          <PathCard path={careerPaths[2]} stagger="stagger-3" />
          <PathCard path={careerPaths[3]} stagger="stagger-4" />
        </div>
      </div>
    </section>
  );
}
