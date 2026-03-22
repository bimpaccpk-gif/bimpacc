import { getCurrentUser } from "@/lib/dal";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <DashboardShell role={user.role} user={user}>
      {children}
    </DashboardShell>
  );
}
