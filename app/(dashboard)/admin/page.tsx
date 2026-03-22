import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Users,
  BookOpen,
  DollarSign,
  Activity,
  UserPlus,
  BookCheck,
  ShieldCheck,
  Settings,
} from "lucide-react";

export default function AdminDashboardPage() {
  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      icon: Users,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Active Courses",
      value: "56",
      change: "+3%",
      icon: BookOpen,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "Enrollments",
      value: "3,456",
      change: "+18%",
      icon: Activity,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
    {
      title: "Revenue",
      value: "$45,678",
      change: "+8%",
      icon: DollarSign,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
  ];

  const activities = [
    {
      text: "New user registered: john@example.com",
      icon: UserPlus,
      iconColor: "text-brand-600 dark:text-brand-400",
      bgColor: "bg-brand-50 dark:bg-brand-950",
    },
    {
      text: "Course published: Introduction to React",
      icon: BookCheck,
      iconColor: "text-success",
      bgColor: "bg-success/10",
    },
    {
      text: "Instructor approved: Jane Smith",
      icon: ShieldCheck,
      iconColor: "text-info",
      bgColor: "bg-info/10",
    },
    {
      text: "System backup completed",
      icon: Settings,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-success">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`rounded-lg p-1.5 ${activity.bgColor}`}>
                    <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activity.text}
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
                "Manage Users",
                "Review Courses",
                "View Reports",
                "System Settings",
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
