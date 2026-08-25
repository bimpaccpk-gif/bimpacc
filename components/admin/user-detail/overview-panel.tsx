import {
  Activity,
  BookOpen,
  Calendar,
  CreditCard,
  GraduationCap,
  MapPin,
  Phone,
  TrendingUp,
  User,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatTile } from "@/components/layout/stat-tile";

import { formatDate, formatDateTime } from "./formatters";
import { InfoRow } from "./info-row";
import type { UserDetailStats, UserDetailUser } from "./types";

interface OverviewPanelProps {
  user: UserDetailUser;
  stats: UserDetailStats;
}

/**
 * "Overview" tab: KPI tiles, account information (including the student device
 * fingerprint dump), and personal information/documents for students or a
 * quick-info card for staff roles. Server-compatible — no hooks, no state.
 */
function OverviewPanel({ user, stats }: OverviewPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Enrolled Courses" value={stats.totalEnrollments} icon={BookOpen} />
        <StatTile label="Completed" value={stats.completedCourses} icon={GraduationCap} />
        <StatTile label="Avg Progress" value={`${stats.overallProgress}%`} icon={TrendingUp} />
        <StatTile label="Account Age" value={`${stats.accountAgeDays} days`} icon={Calendar} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountInformationCard user={user} />

        {user.role === "student" ? (
          <PersonalInformationCard user={user} />
        ) : (
          <QuickInfoCard role={user.role} />
        )}
      </div>
    </div>
  );
}

/** Account metadata plus the full device fingerprint dump for bound students. */
function AccountInformationCard({ user }: { user: UserDetailUser }) {
  const isStudent = user.role === "student";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" aria-hidden="true" />
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

        {isStudent && (
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
                user.device_fingerprint ? `${user.device_fingerprint.slice(0, 16)}...` : undefined
              }
              mono
            />

            {user.device_components && (
              <>
                <Separator />
                <p className="text-sm font-medium">Device Hardware Profile</p>
                <div className="bg-muted/50 space-y-2 rounded-lg p-3">
                  <InfoRow label="Platform" value={user.device_components.platform} />
                  <InfoRow label="GPU (normalized)" value={user.device_components.webglRenderer} />
                  <InfoRow
                    label="GPU (raw)"
                    value={user.device_components.webglRendererRaw}
                    mono
                  />
                  <InfoRow label="GPU Vendor" value={user.device_components.webglVendor} />
                  <InfoRow
                    label="Screen"
                    value={`${user.device_components.screenResolution} @ ${user.device_components.devicePixelRatio}x, ${user.device_components.colorDepth}-bit`}
                  />
                  <InfoRow
                    label="Available Screen"
                    value={user.device_components.availableScreenSize}
                  />
                  <InfoRow
                    label="CPU Cores"
                    value={user.device_components.hardwareConcurrency?.toString()}
                  />
                  <InfoRow
                    label="Device Memory"
                    value={
                      user.device_components.deviceMemory
                        ? `${user.device_components.deviceMemory} GB`
                        : "N/A (unsupported)"
                    }
                  />
                  <InfoRow
                    label="Touch Points"
                    value={user.device_components.maxTouchPoints?.toString()}
                  />
                  <InfoRow
                    label="Canvas Hash"
                    value={user.device_components.canvasFingerprint}
                    mono
                  />
                  <InfoRow
                    label="Audio Hash"
                    value={user.device_components.audioFingerprint}
                    mono
                  />
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const DOCUMENT_LINK_CLASSES =
  "bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium";

/** Student-only profile fields, fee details and downloadable documents. */
function PersonalInformationCard({ user }: { user: UserDetailUser }) {
  const hasDocuments = Boolean(user.cnic_url || user.degree_url || user.fee_receipt_url);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" aria-hidden="true" />
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
          icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" />}
        />
        <InfoRow
          label="Address"
          value={user.postal_address}
          icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />}
        />
        <Separator />
        <InfoRow label="Bank Name" value={user.bank_name} />
        <InfoRow label="Fee Transaction ID" value={user.fee_transaction_id} mono />
        <InfoRow
          label="Fee Submission Date"
          value={user.fee_submission_date ? formatDate(user.fee_submission_date) : null}
        />

        {hasDocuments && (
          <>
            <Separator />
            <p className="text-sm font-medium">Documents</p>
            <div className="flex flex-wrap gap-2">
              {user.cnic_url && (
                <a href={user.cnic_url} target="_blank" rel="noopener noreferrer" className={DOCUMENT_LINK_CLASSES}>
                  <CreditCard className="h-3 w-3" aria-hidden="true" />
                  CNIC Document
                </a>
              )}
              {user.degree_url && (
                <a href={user.degree_url} target="_blank" rel="noopener noreferrer" className={DOCUMENT_LINK_CLASSES}>
                  <GraduationCap className="h-3 w-3" aria-hidden="true" />
                  Degree
                </a>
              )}
              {user.fee_receipt_url && (
                <a
                  href={user.fee_receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={DOCUMENT_LINK_CLASSES}
                >
                  <CreditCard className="h-3 w-3" aria-hidden="true" />
                  Fee Receipt
                </a>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Placeholder card so non-student accounts keep a two-column overview. */
function QuickInfoCard({ role }: { role: UserDetailUser["role"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" aria-hidden="true" />
          Quick Info
        </CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        {role === "admin"
          ? "Admin accounts have full platform access."
          : "Instructor accounts can create and manage courses."}
      </CardContent>
    </Card>
  );
}

export { OverviewPanel };
export type { OverviewPanelProps };
