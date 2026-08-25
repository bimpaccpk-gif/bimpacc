import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileTopbar } from "@/components/layout/mobile-topbar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import type { SessionUser } from "@/lib/dal";
import type { Notification as NotificationType } from "@/app/actions/notifications";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  user: SessionUser;
  notifications?: NotificationType[];
  /** Hydrated server-side from the `sidebar-collapsed` cookie. */
  initialCollapsed?: boolean;
}

/**
 * Dashboard chrome: fixed desktop rail + sticky mobile topbar.
 *
 * `initialCollapsed` comes from the cookie read in app/(dashboard)/layout.tsx
 * so the content offset matches the rail width on first paint; the client
 * collapse toggle only animates the rail itself until the next navigation.
 */
export function DashboardShell({
  children,
  role,
  user,
  notifications,
  initialCollapsed = false,
}: DashboardShellProps) {
  return (
    <div className="bg-surface-sunken min-h-screen">
      <AppSidebar
        role={role}
        user={user}
        notifications={notifications ?? []}
        initialCollapsed={initialCollapsed}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          initialCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <MobileTopbar role={role} user={user} notifications={notifications ?? []} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
