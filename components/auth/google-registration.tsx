"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

interface Course {
  id: string;
  title: string;
  description: string | null;
  batch: string | null;
}

/** Production registration: choose an open course, then continue with Google. */
export function GoogleRegistration({ courses }: { courses: Course[] }) {
  const [courseId, setCourseId] = useState("");
  const hasCourses = courses.length > 0;

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-col space-y-3 text-center">
        <div className="bg-primary/10 text-primary ring-primary/20 mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1">
          <UserPlus className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground/80 text-sm">Start your BIM learning journey today</p>
      </div>

      <div className="flex flex-col space-y-2.5">
        <Label
          htmlFor="courseId"
          className="text-foreground/80 flex items-center gap-2 text-sm font-medium"
        >
          <BookOpen className="text-primary h-4 w-4" />
          Select Course to Enroll
        </Label>
        <div className="relative">
          <select
            id="courseId"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={!hasCourses}
            className="bg-background/50 text-foreground border-border/20 focus:border-primary focus:ring-primary/50 h-12 w-full appearance-none rounded-xl border px-4 shadow-sm transition-all outline-none"
          >
            <option value="">
              {hasCourses ? "Select an open course..." : "No courses currently open for registration"}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} {course.batch ? `(Batch: ${course.batch})` : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          </div>
        </div>
        <p className="text-muted-foreground/60 ml-1 text-xs font-medium">
          {hasCourses
            ? "Choose a course, then continue with your Google account."
            : "You can still sign in with Google; an admin will enroll you."}
        </p>
      </div>

      <GoogleSignInButton courseId={courseId || null} />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
