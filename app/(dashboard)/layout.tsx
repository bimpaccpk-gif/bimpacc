import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingModal } from "@/components/student/onboarding-modal";
import { ApprovalPendingModal } from "@/components/student/approval-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const isStudent = user.role === "student";
  const needsOnboarding = isStudent && !user.onboarding_completed && !user.onboarding_bypassed;
  const needsApproval = isStudent && user.onboarding_completed && !user.is_approved;

  // Fetch selected course if user has one
  let selectedCourse = null;
  if (user.selected_course_id) {
    const supabase = await createClient();
    const { data: course } = await supabase
      .from("courses")
      .select("id, title, batch")
      .eq("id", user.selected_course_id)
      .single();
    selectedCourse = course;
  }

  return (
    <>
      <DashboardShell role={user.role} user={user}>
        {children}
      </DashboardShell>
      {needsOnboarding && <OnboardingModal user={user} selectedCourse={selectedCourse} />}
      {needsApproval && <ApprovalPendingModal user={user} />}
    </>
  );
}
