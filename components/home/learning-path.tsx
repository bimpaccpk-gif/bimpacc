"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  PenTool, 
  Layers, 
  Hammer, 
  Ruler, 
  ArrowRight, 
  CheckCircle2, 
  Lock,
  Circle,
  TrendingUp,
  Target,
  Rocket
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
    color: "text-blue-500 bg-blue-500/10",
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
    color: "text-emerald-500 bg-emerald-500/10",
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
    color: "text-sky-500 bg-sky-500/10",
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
    color: "text-amber-500 bg-amber-500/10",
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

export function LearningPath() {
  return (
    <section className="py-20" id="paths">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Target className="h-4 w-4" />
            <span>Career Paths</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your BIM Career Roadmap
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Follow structured learning paths designed to take you from entry-level 
            to expert in Building Information Modeling. Master industry-standard tools and earn recognized certifications.
          </p>
        </div>

        {/* Career Paths Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {careerPaths.map((path, pathIndex) => (
            <div
              key={path.id}
              className={`scroll-animate visible animate-fadeInUp stagger-${pathIndex + 1}`}
              style={{ opacity: 1 }}
            >
              <div className="rounded-2xl border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover">
                {/* Path Header */}
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${path.color}`}>
                      <path.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        {path.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {path.totalCourses} courses • {path.totalDuration}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Path Levels - Desktop (Horizontal) */}
                <div className="hidden lg:block">
                  <div className="relative">
                    {/* Progress Line */}
                    <div className="absolute left-6 top-8 h-1 w-[calc(100%-48px)] bg-muted" />
                    <div 
                      className="absolute left-6 top-8 h-1 bg-primary transition-all duration-500"
                      style={{ 
                        width: `${
                          (path.levels.filter(l => l.status === "completed").length / (path.levels.length - 1)) * 100
                        }%` 
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
                              <Circle className="h-5 w-5 fill-primary" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </div>
                          
                          {/* Label */}
                          <div className="mt-3 text-center">
                            <p className={`text-sm font-medium ${
                              level.status === "locked" ? "text-muted-foreground" : "text-foreground"
                            }`}>
                              {level.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {level.courses} courses
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Path Levels - Mobile (Vertical) */}
                <div className="lg:hidden space-y-4">
                  {path.levels.map((level, levelIndex) => (
                    <div 
                      key={levelIndex}
                      className={`flex items-center gap-4 rounded-lg p-3 ${
                        level.status === "current" ? "bg-primary/5 border border-primary/20" : ""
                      }`}
                    >
                      <div 
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          level.status === "completed" 
                            ? "bg-primary text-primary-foreground" 
                            : level.status === "current"
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {level.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : level.status === "current" ? (
                          <Circle className="h-4 w-4 fill-primary" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          level.status === "locked" ? "text-muted-foreground" : "text-foreground"
                        }`}>
                          {level.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {level.courses} courses • {level.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Path CTA */}
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Rocket className="h-4 w-4 text-primary" />
                    <span>
                      {path.levels.filter(l => l.status === "completed").length} of {path.levels.length} levels completed
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
          ))}
        </div>
      </div>
    </section>
  );
}
