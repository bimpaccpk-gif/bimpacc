import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserDetail } from "@/app/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import {
  ArrowLeft,
  Mail,
  User,
  Shield,
  Calendar,
  BookOpen,
  GraduationCap,
  Phone,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  TrendingUp,
  Smartphone,
  LogIn,
  AlertTriangle,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "user.created": "Account created",
    "user.deleted": "Account deleted",
    "user.role_changed": "Role changed",
    "user.approved": "Student approved",
    "user.unapproved": "Approval revoked",
    "user.paused": "Account paused",
    "user.unpaused": "Account unpaused",
    "user.onboarding_bypassed": "Onboarding bypassed",
    "user.onboarding_restored": "Onboarding restored",
    "enrollment.created": "Enrolled in course",
    "content_access.paused": "Content paused for student",
    "content_access.unpaused": "Content resumed for student",
    "content_access.bulk_update": "Bulk content access update",
    "content_access.override_removed": "Content access override removed",
  };
  return labels[action] ?? action;
}

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { data, error } = await getUserDetail(userId);

  if (error || !data) {
    notFound();
  }

  const { user, enrollments, auditLog, loginHistory, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="h-16 w-16">
              {user.avatar_file_url ? (
                <AvatarImage src={user.avatar_file_url} alt={user.full_name} />
              ) : user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              ) : null}
              <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 text-lg font-medium">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-foreground text-2xl font-bold">{user.full_name}</h1>
              <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                    user.role === "admin"
                      ? "bg-primary/10 text-primary"
                      : user.role === "instructor"
                        ? "bg-warning/10 text-warning"
                        : "bg-info/10 text-info"
                  }`}
                >
                  {user.role}
                </span>
                {user.is_approved && (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </span>
                )}
                {!user.is_approved && user.onboarding_completed && (
                  <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                    <Clock className="h-3 w-3" />
                    Pending Review
                  </span>
                )}
                {user.onboarding_bypassed && (
                  <span className="bg-info/10 text-info inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                    <Shield className="h-3 w-3" />
                    Onboarding Bypassed
                  </span>
                )}
                {user.is_paused && (
                  <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                    <XCircle className="h-3 w-3" />
                    Paused
                  </span>
                )}
                {user.role === "student" && user.device_fingerprint && (
                  <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                    <Smartphone className="h-3 w-3" />
                    Device Bound
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <UserDetailActions userId={user.id} currentRole={user.role} isPaused={user.is_paused} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Enrolled Courses
            </CardTitle>
            <BookOpen className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Completed</CardTitle>
            <GraduationCap className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCourses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Avg Progress
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overallProgress}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Account Age</CardTitle>
            <Calendar className="text-muted-foreground h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accountAgeDays} days</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="User ID" value={user.id} mono />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Full Name" value={user.full_name} />
            <InfoRow label="Role" value={user.role} capitalize />
            <InfoRow label="Created" value={formatDateTime(user.created_at)} />
            <InfoRow label="Last Updated" value={formatDateTime(user.updated_at)} />
            <Separator />
            <InfoRow
              label="Onboarding"
              value={
                user.onboarding_completed
                  ? "Completed"
                  : user.onboarding_bypassed
                    ? "Bypassed"
                    : "Pending"
              }
            />
            <InfoRow label="Approval" value={user.is_approved ? "Approved" : "Not approved"} />
            <InfoRow label="Account Status" value={user.is_paused ? "Paused" : "Active"} />
            {user.role === "student" && (
              <>
                <Separator />
                <InfoRow
                  label="Device Lock"
                  value={
                    user.hardware_fingerprint
                      ? `Bound on ${formatDateTime(user.device_locked_at!)}`
                      : "Not locked"
                  }
                />
                <InfoRow
                  label="Hardware Fingerprint"
                  value={user.hardware_fingerprint ?? undefined}
                  mono
                />
                <InfoRow
                  label="Browser Fingerprint"
                  value={
                    user.device_fingerprint
                      ? `${user.device_fingerprint.slice(0, 16)}...`
                      : undefined
                  }
                  mono
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Personal Information (students only) */}
        {user.role === "student" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Father's Name" value={user.father_name} />
              <InfoRow label="CNIC Number" value={user.cnic_number} mono />
              <InfoRow label="Date of Birth" value={user.dob ? formatDate(user.dob) : null} />
              <Separator />
              <InfoRow label="Education Level" value={user.education_level} />
              <InfoRow label="Degree Title" value={user.degree_title} />
              <InfoRow label="Profession" value={user.profession} />
              <Separator />
              <InfoRow
                label="WhatsApp"
                value={user.whatsapp_number}
                icon={<Phone className="h-3.5 w-3.5" />}
              />
              <InfoRow
                label="Address"
                value={user.postal_address}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
              <Separator />
              <InfoRow label="Bank Name" value={user.bank_name} />
              <InfoRow label="Fee Transaction ID" value={user.fee_transaction_id} mono />
              <InfoRow
                label="Fee Submission Date"
                value={user.fee_submission_date ? formatDate(user.fee_submission_date) : null}
              />

              {/* Documents */}
              {(user.cnic_url || user.degree_url || user.fee_receipt_url) && (
                <>
                  <Separator />
                  <p className="text-sm font-medium">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {user.cnic_url && (
                      <a
                        href={user.cnic_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        <CreditCard className="h-3 w-3" />
                        CNIC Document
                      </a>
                    )}
                    {user.degree_url && (
                      <a
                        href={user.degree_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        <GraduationCap className="h-3 w-3" />
                        Degree
                      </a>
                    )}
                    {user.fee_receipt_url && (
                      <a
                        href={user.fee_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium"
                      >
                        <CreditCard className="h-3 w-3" />
                        Fee Receipt
                      </a>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Non-student takes full width for account info */}
        {user.role !== "student" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {user.role === "admin"
                ? "Admin accounts have full platform access."
                : "Instructor accounts can create and manage courses."}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Enrolled Courses ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Not enrolled in any courses.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">Course</th>
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">Enrolled</th>
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">Enrolled By</th>
                    <th className="text-muted-foreground pb-3 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.enrollment_id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{enrollment.course_title}</span>
                        {enrollment.course_batch && (
                          <span className="text-muted-foreground ml-1">
                            (Batch {enrollment.course_batch})
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground py-3 pr-4">
                        {formatDate(enrollment.enrolled_at)}
                      </td>
                      <td className="text-muted-foreground py-3 pr-4">
                        {enrollment.enrolled_by_name ?? "System"}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{
                                width: `${enrollment.progress_percent}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                            {enrollment.completed_lessons}/{enrollment.total_lessons} (
                            {enrollment.progress_percent}%)
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log ({auditLog.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-0">
              {auditLog.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b"
                >
                  <div className="bg-muted mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                    <Activity className="text-muted-foreground h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{getAuditActionLabel(entry.action)}</span>
                      {entry.action === "user.role_changed" && entry.details?.old_role && (
                        <span className="text-muted-foreground">
                          {" "}
                          from <span className="font-medium">{entry.details.old_role}</span> to{" "}
                          <span className="font-medium">{entry.details.new_role}</span>
                        </span>
                      )}
                      {entry.action === "enrollment.created" && entry.details?.course_title && (
                        <span className="text-muted-foreground">
                          {" "}
                          — <span className="font-medium">{entry.details.course_title}</span>
                        </span>
                      )}
                      {(entry.action === "content_access.paused" ||
                        entry.action === "content_access.unpaused") &&
                        entry.details?.content_type && (
                          <span className="text-muted-foreground">
                            {" "}
                            —{" "}
                            <span className="font-medium capitalize">
                              {entry.details.content_type}
                            </span>
                            {entry.details?.cascade && <span className="text-xs"> (cascade)</span>}
                          </span>
                        )}
                      {entry.action === "content_access.bulk_update" && (
                        <span className="text-muted-foreground">
                          {" "}
                          —{" "}
                          <span className="font-medium capitalize">
                            {entry.details?.content_type}
                          </span>
                          {entry.details?.student_count && (
                            <span className="text-xs">
                              {" "}
                              ({entry.details.student_count} students)
                            </span>
                          )}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      by {entry.admin_name} &middot; {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Login History ({loginHistory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loginHistory.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No login history recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">Status</th>
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">Date & Time</th>
                    <th className="text-muted-foreground pr-4 pb-3 font-medium">
                      Device Fingerprint
                    </th>
                    <th className="text-muted-foreground pb-3 font-medium">User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        {entry.status === "success" ? (
                          <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            Success
                          </span>
                        ) : entry.status === "failed_device" ? (
                          <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                            <Smartphone className="h-3 w-3" />
                            Device Blocked
                          </span>
                        ) : (
                          <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                            <AlertTriangle className="h-3 w-3" />
                            Wrong Credentials
                          </span>
                        )}
                      </td>
                      <td className="text-muted-foreground py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-muted-foreground font-mono text-xs">
                          {entry.device_fingerprint
                            ? entry.device_fingerprint.slice(0, 12) + "..."
                            : "N/A"}
                        </span>
                      </td>
                      <td className="text-muted-foreground max-w-[200px] truncate py-3 text-xs">
                        {entry.user_agent || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  mono = false,
  capitalize = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        className={`text-right text-sm font-medium ${
          mono ? "font-mono text-xs" : ""
        } ${capitalize ? "capitalize" : ""} ${!value ? "text-muted-foreground/50 italic" : ""}`}
      >
        {icon && <span className="mr-1 inline-flex align-text-top">{icon}</span>}
        {value || "Not provided"}
      </span>
    </div>
  );
}
