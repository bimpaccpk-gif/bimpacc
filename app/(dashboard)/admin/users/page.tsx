import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UsersTable } from "@/components/admin/users-table";
import { Users, ClipboardList } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  onboarding_bypassed: boolean;
  is_approved: boolean;
  created_at: string;
}

interface CourseRow {
  id: string;
  title: string;
  batch: string;
  status: string;
}

async function getAllUsers(): Promise<UserRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, avatar_url, onboarding_completed, onboarding_bypassed, is_approved, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data ?? [];
}

async function getAllCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, title, batch, status")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error fetching courses:", error);
    return [];
  }

  return data ?? [];
}

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();
  const users = await getAllUsers();
  const courses = await getAllCourses();

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pendingReviewCount = users.filter(
    (u) => u.role === "student" && u.onboarding_completed && !u.is_approved
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all platform users
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Instructors
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCounts.instructor ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Students
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCounts.student ?? 0}</div>
          </CardContent>
        </Card>
        <Card className={pendingReviewCount > 0 ? "ring-2 ring-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <ClipboardList className={`h-5 w-5 ${pendingReviewCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingReviewCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {pendingReviewCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingReviewCount > 0 ? "Applications awaiting review" : "All caught up!"}
            </p>
          </CardContent>
        </Card>
      </div>

      <UsersTable
        initialUsers={users}
        courses={courses}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
