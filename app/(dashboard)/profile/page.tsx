import { getFullUserProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Mail,
  User as UserIcon,
  Shield,
  Calendar,
  Clock,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  CreditCard,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { ProfileCompletionForm } from "@/components/student/profile-completion-form";

async function getUserStats(userId: string, role: string) {
  const supabase = await createClient();

  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    enrollments: enrollmentCount ?? 0,
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: string | null) {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function hasProfileData(user: any): boolean {
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

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm font-semibold truncate">{value || "—"}</dd>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getFullUserProfile();
  const stats = await getUserStats(user.id, user.role);

  const isStudent = user.role === "student";
  const hasOnboarded = user.onboarding_completed;
  const showProfileData = isStudent && (hasOnboarded || (user.onboarding_bypassed && hasProfileData(user)));

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const roleBadgeColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    instructor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    student: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            View your account information
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24">
              {user.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              )}
              <AvatarFallback className="bg-brand-100 text-2xl font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-semibold">{user.full_name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span
              className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                roleBadgeColor[user.role] ?? roleBadgeColor.student
              }`}
            >
              {roleLabel}
            </span>

            {/* Approval / Onboarding status for students */}
            {isStudent && (
              <div className="mt-3">
                {hasOnboarded ? (
                  user.is_approved ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                      <Clock className="h-3 w-3" />
                      Under Review
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                    <Clock className="h-3 w-3" />
                    Onboarding Pending
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Your personal information and account status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoField icon={UserIcon} label="Full Name" value={user.full_name} />
              <InfoField icon={Mail} label="Email" value={user.email} />
              <InfoField icon={Shield} label="Role" value={roleLabel} />
              <InfoField icon={Calendar} label="Member Since" value={formatDate(user.created_at)} />
              <InfoField icon={Clock} label="Last Updated" value={formatDate(user.updated_at)} />
              <InfoField
                icon={Mail}
                label="User ID"
                value={`${user.id.slice(0, 8)}...${user.id.slice(-4)}`}
              />
            </dl>
          </CardContent>
        </Card>

        {/* Profile Completion for Bypassed Students */}
        {isStudent && user.onboarding_bypassed && !hasOnboarded && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-indigo-500" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Your onboarding was bypassed by an admin. You can complete your profile
                at any time to provide additional information. All fields are optional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileCompletionForm user={user} />
            </CardContent>
          </Card>
        )}

        {/* ─── Student Profile Details (Text Only) ─── */}
        {showProfileData && (
          <>
            {/* Personal Information */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-indigo-500" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField icon={UserIcon} label="Full Name" value={user.full_name} />
                  <InfoField icon={UserIcon} label="Father's Name" value={user.father_name} />
                  <InfoField icon={CreditCard} label="CNIC / Passport Number" value={user.cnic_number} />
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(user.dob)} />
                </dl>
                {/* NO DocumentField for CNIC or avatar - students cannot see documents */}
              </CardContent>
            </Card>

            {/* Academic Background */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-500" />
                  Academic Background
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoField icon={GraduationCap} label="Education Level" value={user.education_level} />
                  <InfoField icon={GraduationCap} label="Degree Title" value={user.degree_title} />
                  <InfoField icon={Briefcase} label="Profession" value={user.profession} />
                </dl>
                {/* NO DocumentField for degree - students cannot see documents */}
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-indigo-500" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoField icon={Phone} label="WhatsApp Number" value={user.whatsapp_number} />
                  <InfoField icon={MapPin} label="Postal Address" value={user.postal_address} />
                </dl>
              </CardContent>
            </Card>

            {/* Fee Verification */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  Fee Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoField icon={CreditCard} label="Transaction ID" value={user.fee_transaction_id} />
                  <InfoField icon={Calendar} label="Payment Date" value={formatDate(user.fee_submission_date)} />
                  <InfoField icon={CreditCard} label="Bank Name" value={user.bank_name} />
                </dl>
                {/* NO DocumentField for receipt - students cannot see documents */}
              </CardContent>
            </Card>
          </>
        )}

        {/* Stats Cards — existing role-based stats remain unchanged */}
        {user.role === "student" && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Learning Stats</CardTitle>
              <CardDescription>
                Your course progress at a glance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">{stats.enrollments}</p>
                  <p className="text-sm text-muted-foreground">
                    Enrolled Courses
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Completed Courses
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0h</p>
                  <p className="text-sm text-muted-foreground">
                    Total Learning Time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === "instructor" && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Teaching Stats</CardTitle>
              <CardDescription>
                Your teaching activity overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Courses Created
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Total Students
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Published Courses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === "admin" && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Platform Stats</CardTitle>
              <CardDescription>
                Overview of the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">{stats.enrollments}</p>
                  <p className="text-sm text-muted-foreground">
                    Total Enrollments
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Total Users
                  </p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Total Courses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
