"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "lucide-react";

import { AuthHeading } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      <AuthHeading
        title="Create your account"
        description={
          hasCourses
            ? "Choose the course you are joining, then continue with Google."
            : "Continue with Google. An admin will enroll you in your course."
        }
      />

      {hasCourses && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Course</legend>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {courses.map((course) => {
              const selected = course.id === courseId;
              return (
                <label
                  key={course.id}
                  className={cn(
                    "has-focus-visible:ring-ring/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3",
                    selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="course"
                    value={course.id}
                    checked={selected}
                    onChange={() => setCourseId(course.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    )}
                  >
                    {selected && <CheckIcon className="size-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{course.title}</span>
                    {(course.batch || course.description) && (
                      <span className="text-muted-foreground line-clamp-2 block text-xs">
                        {course.batch ? `Batch ${course.batch}` : ""}
                        {course.batch && course.description ? " · " : ""}
                        {course.description}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="space-y-2">
        <GoogleSignInButton courseId={courseId || null} />
        {hasCourses && !courseId && (
          <p className="text-muted-foreground text-xs">
            No course chosen? You can still continue; an admin will enroll you.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
