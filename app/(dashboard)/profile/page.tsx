import { getCurrentUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  Edit,
} from "lucide-react";
import Link from "next/link";

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const stats = await getUserStats(user.id, user.role);

  const roleLabel =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const roleBadgeColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    instructor:
      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    student:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
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
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Your personal information and account status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <UserIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </dt>
                  <dd className="text-sm font-semibold">{user.full_name}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Email
                  </dt>
                  <dd className="text-sm font-semibold">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Role
                  </dt>
                  <dd className="text-sm font-semibold">{roleLabel}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Member Since
                  </dt>
                  <dd className="text-sm font-semibold">
                    {user.created_at ? formatDate(user.created_at) : "N/A"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </dt>
                  <dd className="text-sm font-semibold">
                    {user.updated_at ? formatDate(user.updated_at) : "N/A"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    User ID
                  </dt>
                  <dd className="font-mono text-xs font-semibold">
                    {user.id.slice(0, 8)}...{user.id.slice(-4)}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Stats Card */}
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
