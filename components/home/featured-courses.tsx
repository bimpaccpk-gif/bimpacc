"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, ArrowRight, BookOpen, TrendingUp } from "lucide-react";

interface Course {
  id: string;
  title: string;
  category: string;
  instructor: string;
  rating: number;
  students: number;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  price: number;
  thumbnail?: string;
}

const featuredCourses: Course[] = [
  {
    id: "1",
    title: "Advanced Machine Learning & AI",
    category: "AI/ML",
    instructor: "Dr. Sarah Chen",
    rating: 4.9,
    students: 2500,
    duration: "24 hours",
    level: "Advanced",
    price: 79,
  },
  {
    id: "2",
    title: "Cloud Architecture with AWS",
    category: "Cloud",
    instructor: "Michael Torres",
    rating: 4.8,
    students: 3200,
    duration: "18 hours",
    level: "Intermediate",
    price: 59,
  },
  {
    id: "3",
    title: "Full-Stack Development Mastery",
    category: "Web Dev",
    instructor: "Emily Rodriguez",
    rating: 4.9,
    students: 5100,
    duration: "40 hours",
    level: "Beginner",
    price: 89,
  },
  {
    id: "4",
    title: "DevOps & CI/CD Pipeline Design",
    category: "DevOps",
    instructor: "James Wilson",
    rating: 4.7,
    students: 1800,
    duration: "16 hours",
    level: "Intermediate",
    price: 49,
  },
  {
    id: "5",
    title: "Data Engineering with Python",
    category: "Data",
    instructor: "Lisa Park",
    rating: 4.8,
    students: 2100,
    duration: "22 hours",
    level: "Intermediate",
    price: 69,
  },
  {
    id: "6",
    title: "Cybersecurity Fundamentals",
    category: "Security",
    instructor: "Robert Kim",
    rating: 4.9,
    students: 1500,
    duration: "20 hours",
    level: "Beginner",
    price: 59,
  },
];

const categoryColors: Record<string, string> = {
  "AI/ML": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Cloud": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Web Dev": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "DevOps": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Data": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Security": "bg-red-500/10 text-red-600 dark:text-red-400",
};

const levelColors: Record<string, string> = {
  Beginner: "bg-green-500/10 text-green-600 dark:text-green-400",
  Intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Advanced: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function FeaturedCourses() {
  return (
    <section className="py-20" id="courses">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" />
            <span>Featured Courses</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Build In-Demand Engineering Skills
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Master the technologies that top employers are looking for. 
            Each course is designed by industry experts with hands-on projects.
          </p>
        </div>

        {/* Course Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.map((course, index) => (
            <div
              key={course.id}
              className={`group scroll-animate visible animate-fadeInUp stagger-${index + 1}`}
              style={{ opacity: 1 }}
            >
              <div className="h-full overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-card-hover">
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  </div>
                  {/* Category Badge */}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                      categoryColors[course.category] || "bg-primary/10 text-primary"
                    }`}
                  >
                    {course.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-foreground">
                    {course.title}
                  </h3>

                  {/* Instructor */}
                  <p className="mb-3 text-sm text-muted-foreground">
                    by {course.instructor}
                  </p>

                  {/* Rating */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(course.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {course.rating}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({course.students.toLocaleString()} students)
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.level}</span>
                    </div>
                  </div>

                  {/* Level Badge */}
                  <div className="mb-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        levelColors[course.level] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {course.level}
                    </span>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <div>
                      <span className="text-2xl font-bold text-foreground">
                        ${course.price}
                      </span>
                    </div>
                    <Link href="/register">
                      <Button size="sm" className="gap-1">
                        View Course
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-12 text-center">
          <Link href="/register">
            <Button variant="outline" size="lg" className="gap-2">
              View All Courses
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
