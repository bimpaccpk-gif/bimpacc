import { getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OnboardingModal } from "@/components/student/onboarding-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const isStudent = user.role === "student";
  const needsOnboarding = isStudent && !user.onboarding_completed;

  return (
    <>
      <DashboardShell role={user.role} user={user}>
        {children}
      </DashboardShell>
      {needsOnboarding && <OnboardingModal user={user} />}
    </>
  );
}
