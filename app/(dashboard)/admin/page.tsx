import Link from "next/link";
import { Activity, BookOpen, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/dal";

export default async function AdminDashboardPage() {
  await getCurrentUser();

  const supabase = await createClient();

  const [usersCount, coursesCount, enrollmentsCount, recentUsers] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("enrollments").select("*", { count: "exact", head: true }),
    supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      title: "Total Users",
      value: (usersCount.count ?? 0).toLocaleString(),
      icon: Users,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Published Courses",
      value: (coursesCount.count ?? 0).toLocaleString(),
      icon: BookOpen,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Enrollments",
      value: (enrollmentsCount.count ?? 0).toLocaleString(),
      icon: Activity,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
    {
      title: "Recent Users",
      value: (recentUsers.data?.length ?? 0).toLocaleString(),
      icon: UserPlus,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  const recentUsersList = recentUsers.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of your learning management system
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsersList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users registered yet.</p>
              ) : (
                recentUsersList.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className="bg-brand-50 dark:bg-brand-950 rounded-lg p-1.5">
                      <UserPlus className="text-brand-600 dark:text-brand-400 h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground text-sm">
                        {user.full_name || user.email}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {user.email} &middot; {user.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link
                href="/admin/users"
                className="text-foreground/80 hover:border-primary/30 hover:bg-brand-50/50 dark:hover:bg-brand-950/50 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors"
              >
                Manage Users
              </Link>
              <Link
                href="/admin/courses"
                className="text-foreground/80 hover:border-primary/30 hover:bg-brand-50/50 dark:hover:bg-brand-950/50 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors"
              >
                Review Courses
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
