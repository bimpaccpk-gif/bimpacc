"use client";

import { useEffect, useState } from "react";
import { Users, BookOpen, Award, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Stat {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export function Stats() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      
      try {
        // Fetch real stats from the database
        const [usersResult, coursesResult, enrollmentsResult] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("enrollments").select("id", { count: "exact", head: true }),
        ]);

        const totalUsers = usersResult.count ?? 0;
        const totalCourses = coursesResult.count ?? 0;
        const totalEnrollments = enrollmentsResult.count ?? 0;

        setStats([
          {
            value: totalUsers.toLocaleString(),
            label: "Registered Users",
            icon: Users,
            color: "bg-primary/10 text-primary",
          },
          {
            value: totalCourses.toLocaleString(),
            label: "Published Courses",
            icon: BookOpen,
            color: "bg-success/10 text-success",
          },
          {
            value: totalEnrollments.toLocaleString(),
            label: "Total Enrollments",
            icon: TrendingUp,
            color: "bg-info/10 text-info",
          },
          {
            value: "98%",
            label: "Completion Rate",
            icon: Award,
            color: "bg-warning/10 text-warning",
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Fallback to placeholder stats
        setStats([
          { value: "1,000+", label: "Registered Users", icon: Users, color: "bg-primary/10 text-primary" },
          { value: "50+", label: "Published Courses", icon: BookOpen, color: "bg-success/10 text-success" },
          { value: "5,000+", label: "Total Enrollments", icon: TrendingUp, color: "bg-info/10 text-info" },
          { value: "98%", label: "Completion Rate", icon: Award, color: "bg-warning/10 text-warning" },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <section className="relative overflow-hidden border-y bg-muted/30 py-16">
        <div className="absolute inset-0 bg-dots-pattern opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center text-center animate-pulse">
                <div className="mb-4 h-16 w-16 rounded-2xl bg-muted" />
                <div className="mb-1 h-8 w-20 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-y bg-muted/30 py-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center"
            >
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${stat.color} transition-transform duration-300 hover:scale-110`}>
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="mb-1 text-4xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}