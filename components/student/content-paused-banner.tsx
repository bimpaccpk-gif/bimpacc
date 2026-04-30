import Link from "next/link";
import { PauseCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentPausedBannerProps {
  blockedAt: "account" | "course" | "semester" | "subject" | "lesson";
  courseId?: string;
}

const messages: Record<string, { title: string; description: string }> = {
  account: {
    title: "Account Suspended",
    description:
      "Your account has been temporarily suspended. Contact your instructor for more information.",
  },
  course: {
    title: "Course Paused",
    description:
      "This course has been temporarily paused by your instructor. Please check back later.",
  },
  semester: {
    title: "Semester Paused",
    description:
      "This semester has been temporarily paused by your instructor. Please check back later.",
  },
  subject: {
    title: "Subject Paused",
    description:
      "This subject has been temporarily paused by your instructor. Please check back later.",
  },
  lesson: {
    title: "Lesson Paused",
    description:
      "This lesson has been temporarily paused by your instructor. Please check back later.",
  },
};

export function ContentPausedBanner({ blockedAt, courseId }: ContentPausedBannerProps) {
  const msg = messages[blockedAt] ?? messages.course;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-md space-y-6 px-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
          <PauseCircle className="h-10 w-10 text-warning" />
        </div>
        <div className="space-y-2">
          <h2 className="text-foreground text-2xl font-bold">{msg.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{msg.description}</p>
        </div>
        {courseId && blockedAt !== "course" && blockedAt !== "account" && (
          <Link href={`/student/courses/${courseId}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Button>
          </Link>
        )}
        {(blockedAt === "course" || blockedAt === "account") && (
          <Link href="/student/courses">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Courses
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
