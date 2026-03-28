import { getCurrentUser } from "@/lib/dal";
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
  const needsOnboarding = isStudent && !user.onboarding_completed;
  const needsApproval = isStudent && user.onboarding_completed && !user.is_approved;

  return (
    <>
      <DashboardShell role={user.role} user={user}>
        {children}
      </DashboardShell>
      {needsOnboarding && <OnboardingModal user={user} />}
      {needsApproval && <ApprovalPendingModal user={user} />}
    </>
  );
}
