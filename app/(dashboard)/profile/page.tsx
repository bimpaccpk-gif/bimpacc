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

async function getSignedUrl(filePath: string | null) {
  if (!filePath) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("student_documents")
    .createSignedUrl(filePath, 60 * 60);
  if (error) return null;
  return data.signedUrl;
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

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(url);
}

function DocumentField({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{label}: Not uploaded</span>
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="px-4 py-2 bg-muted/30 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
        <div className="group relative bg-white dark:bg-zinc-900">
          <img
            src={url}
            alt={label}
            className="w-full max-h-48 object-contain"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          >
            <Download className="h-3 w-3" />
            Open Full Size
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border p-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
    >
      <FileText className="h-5 w-5 text-indigo-500" />
      <span className="flex-1">{label}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}

export default async function ProfilePage() {
  const user = await getFullUserProfile();
  const stats = await getUserStats(user.id, user.role);

  const isStudent = user.role === "student";
  const hasOnboarded = user.onboarding_completed;

  // Generate signed URLs for documents (only for students who onboarded)
  let cnicUrl: string | null = null;
  let degreeUrl: string | null = null;
  let receiptUrl: string | null = null;
  let avatarFileUrl: string | null = null;

  if (isStudent && hasOnboarded) {
    [cnicUrl, degreeUrl, receiptUrl, avatarFileUrl] = await Promise.all([
      getSignedUrl(user.cnic_file_path),
      getSignedUrl(user.degree_file_path),
      getSignedUrl(user.fee_receipt_file_path),
      getSignedUrl(user.avatar_file_path),
    ]);
  }

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
            {/* Show uploaded student photo if available, otherwise avatar */}
            {avatarFileUrl ? (
              <img
                src={avatarFileUrl}
                alt={user.full_name}
                className="h-24 w-24 rounded-full object-cover border-2 border-border shadow-md"
              />
            ) : (
              <Avatar className="h-24 w-24">
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={user.full_name} />
                )}
                <AvatarFallback className="bg-brand-100 text-2xl font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
            )}
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

        {/* ─── Student Onboarding Details ─── */}
        {isStudent && hasOnboarded && (
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
                  <InfoField icon={Calendar} label="Date of Birth" value={formatDate(user.dob)} />
                </dl>
                {/* Documents */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <DocumentField url={cnicUrl} label="CNIC / Passport" />
                  <DocumentField url={avatarFileUrl} label="Student Photo" />
                </div>
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
                <div className="mt-6">
                  <DocumentField url={degreeUrl} label="Degree / Certificate" />
                </div>
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
                </dl>
                <div className="mt-6">
                  <DocumentField url={receiptUrl} label="Fee Receipt / Screenshot" />
                </div>
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
