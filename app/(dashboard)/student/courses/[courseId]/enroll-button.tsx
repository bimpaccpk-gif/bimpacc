"use client";

import { useActionState } from "react";
import { enrollInCourse } from "@/app/actions/course";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export function EnrollButton({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(enrollInCourse, undefined);

  if (state?.success) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
        <CheckCircle2 className="h-4 w-4" />
        {state.success}
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      {state?.error && (
        <p className="text-xs text-red-500 mb-1">{state.error}</p>
      )}
      <Button type="submit" disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Enroll Now
      </Button>
    </form>
  );
}
