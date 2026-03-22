import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, Star } from "lucide-react";

export default function InstructorDashboardPage() {
  const stats = [
    {
      title: "My Courses",
      value: "8",
      icon: BookOpen,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Total Students",
      value: "456",
      icon: Users,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Completion Rate",
      value: "78%",
      icon: BarChart3,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
    {
      title: "Avg. Rating",
      value: "4.8",
      icon: Star,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Instructor Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your courses and track student progress
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
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
            <CardTitle className="text-lg">My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  title: "Introduction to React",
                  students: 124,
                  status: "Published",
                },
                {
                  title: "Advanced TypeScript",
                  students: 89,
                  status: "Published",
                },
                {
                  title: "Node.js Fundamentals",
                  students: 67,
                  status: "Draft",
                },
              ].map((course) => (
                <div
                  key={course.title}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {course.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {course.students} students
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      course.status === "Published"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {course.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {[
                "Create New Course",
                "View Student Submissions",
                "Check Analytics",
                "Update Profile",
              ].map((action) => (
                <button
                  key={action}
                  className="rounded-lg border px-4 py-2.5 text-left text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-brand-50/50 dark:hover:bg-brand-950/50"
                >
                  {action}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
