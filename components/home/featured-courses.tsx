"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, ArrowRight, BookOpen, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Course {
  id: string;
  title: string;
  description: string;
  batch: string;
  hierarchy_type: number;
  created_at: string;
}

const hierarchyLabels: Record<number, string> = {
  1: "Full Course Structure",
  2: "Standard Course",
  3: "Simple Course",
};

const hierarchyColors: Record<number, string> = {
  1: "bg-primary/10 text-primary",
  2: "bg-success/10 text-success",
  3: "bg-info/10 text-info",
};

export function FeaturedCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, description, batch, hierarchy_type, created_at")
          .eq("status", "published")
          .eq("registration_open", true)
          .order("order_index", { ascending: true })
          .limit(6);

        if (error) {
          console.error("Error fetching courses:", error);
          return;
        }

        setCourses(data || []);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <section className="py-20" id="courses">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="border-primary/20 bg-primary/5 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              <span>Featured Courses</span>
            </div>
            <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Build In-Demand BIM Skills
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Master Building Information Modeling with hands-on courses designed by industry experts.
            </p>
          </div>

          {/* Course Grid Skeleton */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl border overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-5 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="py-20" id="courses">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="border-primary/20 bg-primary/5 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              <span>Featured Courses</span>
            </div>
            <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Build In-Demand BIM Skills
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              New courses coming soon! Check back for our latest BIM training programs.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20" id="courses">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="border-primary/20 bg-primary/5 text-primary mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            <span>Featured Courses</span>
          </div>
          <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Build In-Demand BIM Skills
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Master Building Information Modeling with hands-on courses designed by industry experts.
          </p>
        </div>

        {/* Course Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group"
            >
              <div className="bg-card hover:border-primary/30 hover:shadow-card-hover h-full overflow-hidden rounded-2xl border transition-all duration-300">
                {/* Thumbnail */}
                <div className="from-primary/20 to-primary/5 relative aspect-video overflow-hidden bg-gradient-to-br">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="text-primary/40 h-12 w-12" />
                  </div>
                  {/* Category Badge */}
                  <span
                    className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                      hierarchyColors[course.hierarchy_type] || "bg-primary/10 text-primary"
                    }`}
                  >
                    {hierarchyLabels[course.hierarchy_type] || "Course"}
                  </span>
                  {course.batch && (
                    <span className="absolute top-3 right-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                      Batch {course.batch}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-foreground mb-2 line-clamp-2 text-lg font-semibold">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                    {course.description || "Learn essential BIM skills with this comprehensive course."}
                  </p>

                  {/* Meta Info */}
                  <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Self-paced</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>All levels</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link href="/register">
                    <Button className="w-full gap-2">
                      Enroll Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        {courses.length >= 6 && (
          <div className="mt-12 text-center">
            <Link href="/register">
              <Button variant="outline" size="lg" className="gap-2">
                View All Courses
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}