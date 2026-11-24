import Link from "next/link";
import { AwardIcon, BookOpenIcon, CheckCircle2, CircleCheckIcon, Clock } from "lucide-react";

import { getFullUserProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { StudentProfileFields } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/layout/stat-tile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileCompletionForm } from "@/components/student/profile-completion-form";
import { cn } from "@/lib/utils";

/** Real learning numbers for the signed-in student (COUNT queries, own rows only via RLS). */
async function getStudentStats(userId: string) {
  const supabase = await createClient();
  const [enrollments, lessons, certificates] = await Promise.all([
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("lesson_progress")
      .select("id, enrollments!inner(user_id)", { count: "exact", head: true })
      .eq("completed", true)
      .eq("enrollments.user_id", userId),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    enrollments: enrollments.count ?? 0,
    lessonsCompleted: lessons.count ?? 0,
    certificates: certificates.count ?? 0,
  };
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function hasProfileData(user: StudentProfileFields): boolean {
  return !!(
    user.father_name ||
    user.cnic_number ||
    user.dob ||
    user.education_level ||
    user.degree_title ||
    user.profession ||
    user.whatsapp_number ||
    user.postal_address ||
    user.fee_transaction_id ||
    user.fee_submission_date ||
    user.bank_name ||
    user.cnic_file_path ||
    user.degree_file_path ||
    user.fee_receipt_file_path ||
    user.avatar_file_path
  );
}

function Badge({ tone, children }: { tone: "success" | "warning" | "info" | "muted"; children: React.ReactNode }) {
  const tones = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    info: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

/** A titled group of label/value pairs. */
function Section({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ label: string; value: string | null | undefined; wide?: boolean }>;
}) {
  return (
    <section className="px-5 py-4">
      <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className={cn("min-w-0", f.wide && "sm:col-span-2")}>
            <dt className="text-muted-foreground text-xs">{f.label}</dt>
            <dd className="mt-0.5 text-sm font-medium break-words">{f.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function ProfilePage() {
  const user = await getFullUserProfile();

  const isStudent = user.role === "student";
  const hasOnboarded = user.onboarding_completed;
  const showProfileData = isStudent && (hasOnboarded || (user.onboarding_bypassed && hasProfileData(user)));
  const stats = isStudent ? await getStudentStats(user.id) : null;

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const memberSince = formatDate(user.created_at);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader title="Profile" description="Your account and learning details." className="mb-0" />

      {/* Identity */}
      <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1 sm:flex-row sm:items-center">
        <Avatar className="h-16 w-16">
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{user.full_name}</h2>
          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="info">{roleLabel}</Badge>
            {isStudent &&
              (!hasOnboarded ? (
                <Badge tone="warning">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Onboarding pending
                </Badge>
              ) : user.is_approved ? (
                <Badge tone="success">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Approved
                </Badge>
              ) : (
                <Badge tone="warning">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Under review
                </Badge>
              ))}
            {memberSince && <span className="text-muted-foreground text-xs">Member since {memberSince}</span>}
          </div>
        </div>
      </div>

      {/* Learning numbers (students only; real counts) */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Courses enrolled" value={stats.enrollments} icon={BookOpenIcon} />
          <StatTile label="Lessons completed" value={stats.lessonsCompleted} icon={CircleCheckIcon} />
          <Link
            href="/student/certificates"
            className="focus-visible:ring-ring/50 group block rounded-xl outline-none focus-visible:ring-3"
          >
            <StatTile
              label="Certificates"
              value={stats.certificates}
              icon={AwardIcon}
              hint="View certificates"
              className="group-hover:ring-primary/40 transition-shadow"
            />
          </Link>
        </div>
      )}

      {/* Onboarding bypassed by an admin: optional completion form */}
      {isStudent && user.onboarding_bypassed && !hasOnboarded && (
        <section className="bg-card ring-foreground/10 rounded-xl p-5 ring-1">
          <h2 className="text-sm font-semibold">Complete your profile</h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            An admin let you skip onboarding. You can add your details at any time; every field is optional.
          </p>
          <ProfileCompletionForm user={user} />
        </section>
      )}

      {/* Details */}
      <div className="bg-card ring-foreground/10 divide-border divide-y rounded-xl ring-1">
        <Section
          title="Account"
          fields={[
            { label: "Full name", value: user.full_name },
            { label: "Email", value: user.email },
            { label: "Role", value: roleLabel },
            { label: "Last updated", value: formatDate(user.updated_at) },
          ]}
        />

        {showProfileData && (
          <>
            <Section
              title="Personal"
              fields={[
                { label: "Father's name", value: user.father_name },
                { label: "CNIC / passport number", value: user.cnic_number },
                { label: "Date of birth", value: formatDate(user.dob) },
              ]}
            />
            <Section
              title="Education"
              fields={[
                { label: "Education level", value: user.education_level },
                { label: "Degree title", value: user.degree_title },
                { label: "Profession", value: user.profession },
              ]}
            />
            <Section
              title="Contact"
              fields={[
                { label: "WhatsApp number", value: user.whatsapp_number },
                { label: "Postal address", value: user.postal_address, wide: true },
              ]}
            />
            {/* Uploaded documents are intentionally not shown to students. */}
            <Section
              title="Fee"
              fields={[
                { label: "Transaction ID", value: user.fee_transaction_id },
                { label: "Payment date", value: formatDate(user.fee_submission_date) },
                { label: "Bank", value: user.bank_name },
              ]}
            />
          </>
        )}
      </div>

      {!isStudent && (
        <p className="text-muted-foreground text-sm">
          Your activity is on your{" "}
          <Link href={user.role === "admin" ? "/admin" : "/instructor"} className="text-primary font-medium hover:underline">
            dashboard
          </Link>
          .
        </p>
      )}
    </div>
  );
}
