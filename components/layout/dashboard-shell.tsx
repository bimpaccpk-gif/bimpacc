import { DashboardNavbar } from "@/components/layout/dashboard-navbar";
import type { UserRole } from "@/types";
import type { SessionUser } from "@/lib/dal";
import type { Notification as NotificationType } from "@/app/actions/notifications";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  user: SessionUser;
  notifications?: NotificationType[];
}

export function DashboardShell({ children, role, user, notifications }: DashboardShellProps) {
  return (
    <div className="bg-surface-sunken min-h-screen">
      <DashboardNavbar
        role={role}
        user={user}
        isSuperAdmin={user.is_super_admin}
        notifications={notifications ?? []}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
