import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getUserDetail } from "@/app/actions/admin";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  AccessPanel,
  ActivityPanel,
  DetailTabs,
  DevicesPanel,
  EnrollmentsPanel,
  LockedAccountAlert,
  OverviewPanel,
  SecurityPanel,
  UserIdentity,
} from "@/components/admin/user-detail";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import type { DetailTab } from "@/components/admin/user-detail/detail-tabs";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { data, error } = await getUserDetail(userId);

  if (error || !data) {
    notFound();
  }

  const { user, enrollments, auditLog, loginHistory, sessions, stats } = data;

  // Panels are rendered here on the server and handed to the client tab shell
  // as plain nodes — the shell only controls visibility.
  const tabs: DetailTab[] = [
    {
      id: "overview",
      label: "Overview",
      content: <OverviewPanel user={user} stats={stats} />,
    },
    {
      id: "enrollments",
      label: `Courses (${enrollments.length})`,
      content: <EnrollmentsPanel enrollments={enrollments} />,
    },
    ...(user.role === "student"
      ? [
          {
            id: "access",
            label: "Content Access",
            content: <AccessPanel userId={user.id} />,
          } satisfies DetailTab,
        ]
      : []),
    {
      id: "devices",
      label: "Devices",
      content: (
        <DevicesPanel
          userId={user.id}
          role={user.role}
          sessions={sessions}
          readOnly={user.is_super_admin}
        />
      ),
    },
    {
      id: "security",
      label: "Login History",
      content: <SecurityPanel loginHistory={loginHistory} />,
    },
    {
      id: "activity",
      label: `Activity (${auditLog.length})`,
      content: <ActivityPanel auditLog={auditLog} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={user.full_name}
        description={user.email}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "People", href: "/admin/users" },
          { label: user.full_name },
        ]}
        actions={
          <>
            <Link
              href="/admin/users"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Link>
            <UserDetailActions
              userId={user.id}
              currentRole={user.role}
              isPaused={user.is_paused}
              isLocked={user.is_locked}
              isSuperAdmin={user.is_super_admin}
            />
          </>
        }
      />

      <UserIdentity user={user} />

      {user.is_locked && <LockedAccountAlert />}

      <DetailTabs tabs={tabs} />
    </div>
  );
}
