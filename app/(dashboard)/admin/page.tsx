import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  UsersIcon,
} from "lucide-react";

import {
  getAdminOverview,
  type AdminOverviewDelta,
  type AnalyticsRange,
} from "@/app/actions/analytics";
import { PendingApprovalsQueue, type PendingQueueItem } from "@/components/admin/pending-approvals-queue";
import { AttendanceChart, ATTENDANCE_TARGET } from "@/components/charts/attendance-chart";
import { CompletionFunnel } from "@/components/charts/completion-funnel";
import { EnrollmentsChart } from "@/components/charts/enrollments-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile, type StatTileDelta } from "@/components/layout/stat-tile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount, formatPercent } from "@/components/charts/format";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Formatting — pure helpers, pinned locale so server-rendered
   markup stays stable across hydration.
   ──────────────────────────────────────────────────────────── */

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** "2026-08-25T…" -> "Aug 25, 2026" */
function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2026-08-25T14:02:11Z" -> "Aug 25, 2026, 2:14 PM" */
function formatDateTime(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Coarse relative age ("just now", "4h ago") for the approvals queue rows. */
function relativeTimeLabel(date: string): string {
  const parsed = new Date(date).getTime();
  if (Number.isNaN(parsed)) return "";

  const diffMs = Date.now() - parsed;
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
}

/** "Ada Lovelace" -> "AL"; falls back to "?" when nothing usable remains. */
function initialsOf(name: string): string {
  const computed = name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return computed || "?";
}

/* ────────────────────────────────────────────────────────────
   Range filter
   ──────────────────────────────────────────────────────────── */

const RANGE_OPTIONS: Array<{
  value: AnalyticsRange;
  label: string;
  /** Phrase used in the page description. */
  comparison: string;
}> = [
  { value: "7d", label: "7 days", comparison: "the last 7 days with the previous 7" },
  { value: "30d", label: "30 days", comparison: "the last 30 days with the previous 30" },
  { value: "90d", label: "90 days", comparison: "the last 90 days with the previous 90" },
  { value: "12m", label: "12 months", comparison: "the last 12 months with the previous 12" },
];

const RANGE_VALUES: ReadonlyArray<string> = RANGE_OPTIONS.map((option) => option.value);

/* ────────────────────────────────────────────────────────────
   KPI delta mapping
   ──────────────────────────────────────────────────────────── */

/**
 * AdminOverviewDelta -> StatTile delta. "flat" and baseline-less windows carry
 * `good: null`; those tiles simply omit the delta rather than imply a direction.
 */
function toTileDelta(delta: AdminOverviewDelta): StatTileDelta {
  return {
    value: delta.label,
    direction: delta.direction === "down" ? "down" : "up",
    good: delta.good ?? undefined,
  };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;

  const rangeParam = firstParam(resolvedParams.range);
  const range = (RANGE_VALUES as ReadonlyArray<string>).includes(rangeParam ?? "")
    ? (rangeParam as AnalyticsRange)
    : "30d";

  // Re-validates the caller's role server-side before every aggregation.
  const overview = await getAdminOverview(range);
  const kpis = overview.kpis;

  const rangeOption =
    RANGE_OPTIONS.find((option) => option.value === overview.range) ?? RANGE_OPTIONS[1];

  /* ── Derived display values ── */

  const enrollments12mTotal = overview.enrollmentsByMonth.reduce((sum, point) => sum + point.value, 0);
  const hasEnrollments = enrollments12mTotal > 0;
  const hasAttendance = overview.attendanceRateByMonth.some((point) => point.rate > 0);
  const hasFunnel = overview.completionFunnel.some((step) => step.value > 0);

  const enrollmentsDeltaSuffix =
    kpis.enrollmentsDelta.good === null ? "" : ` · ${kpis.enrollmentsDelta.label} vs previous window`;
  const attendanceDeltaSuffix =
    kpis.attendanceDelta.good === null ? "" : ` · ${kpis.attendanceDelta.label} vs previous window`;

  const queueItems: Array<PendingQueueItem> = overview.pendingQueue.map((item) => ({
    ...item,
    requestedLabel: relativeTimeLabel(item.createdAt),
  }));

  /* ── Approvals tile: StatTile pins its icon chrome to primary, so retint it
     from here when there is work waiting (warning tint + ring, per house
     pattern on the People page). ── */
  const approvalsTileClassName = cn(
    "transition-transform duration-200 group-hover:-translate-y-0.5",
    kpis.pendingApprovals > 0 &&
      "ring-warning/50 [&_[data-slot=stat-tile-header]>div:last-child]:bg-warning/10 [&_[data-slot=stat-tile-header]>div:last-child>svg]:text-warning"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`Comparing ${rangeOption.comparison}. Updated ${formatDateTime(overview.generatedAt)}.`}
        actions={
          <nav aria-label="Comparison range" className="bg-muted flex items-center rounded-lg p-0.5">
            {RANGE_OPTIONS.map((option) => {
              const isActive = option.value === overview.range;

              return (
                <Link
                  key={option.value}
                  href={`/admin?range=${option.value}`}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Students"
          value={formatCount(kpis.totalStudents)}
          icon={UsersIcon}
        />

        <StatTile
          label="Active enrollments"
          value={formatCount(kpis.activeEnrollments)}
          hint={`vs previous ${overview.rangeDays === 365 ? "year" : `${overview.rangeDays} days`}`}
          icon={GraduationCapIcon}
          delta={
            kpis.enrollmentsDelta.good === null ? undefined : toTileDelta(kpis.enrollmentsDelta)
          }
        />

        <StatTile label="Courses" value={formatCount(kpis.totalCourses)} icon={BookOpenIcon} />

        <Link
          href="/admin/users?status=pending_review"
          className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StatTile
            label="Pending approvals"
            value={formatCount(kpis.pendingApprovals)}
            hint={kpis.pendingApprovals > 0 ? "Applications awaiting review" : "All caught up"}
            icon={ClipboardListIcon}
            className={approvalsTileClassName}
          />
        </Link>
      </div>

      {/* Hero: the approval queue */}
      <PendingApprovalsQueue items={queueItems} totalCount={kpis.pendingApprovals} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EnrollmentsChart
          data={overview.enrollmentsByMonth}
          isEmpty={!hasEnrollments}
          subtitle={`${formatCount(enrollments12mTotal)} new in the trailing 12 months${enrollmentsDeltaSuffix}`}
          className="lg:col-span-2"
        />

        <AttendanceChart
          data={overview.attendanceRateByMonth}
          target={ATTENDANCE_TARGET}
          isEmpty={!hasAttendance}
          subtitle={`${formatPercent(kpis.attendanceRate)} present or late this window vs ${ATTENDANCE_TARGET}% target${attendanceDeltaSuffix} · months with no sessions read as 0%`}
        />

        <CompletionFunnel data={overview.completionFunnel} isEmpty={!hasFunnel} />
      </div>

      {/* Recent signups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent signups</CardTitle>
          <CardDescription>The newest accounts on the platform</CardDescription>
        </CardHeader>

        <Table className="px-4">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Role</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {overview.recentUsers.length === 0 ? (
              <TableEmpty colSpan={3}>No users have signed up yet.</TableEmpty>
            ) : (
              overview.recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar size="sm">
                        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                        <AvatarFallback>{initialsOf(user.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.full_name || user.email}</p>
                        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden capitalize sm:table-cell">
                    {user.role}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                    {formatDate(user.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <CardFooter className="justify-between px-4 py-3">
          <span className="text-muted-foreground text-xs">
            Showing the latest {overview.recentUsers.length} signups
          </span>
          <Link href="/admin/users" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            View all people
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
