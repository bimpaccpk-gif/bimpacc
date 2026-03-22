import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, BookOpen, DollarSign, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  const stats = [
    { title: "Total Users", value: "1,234", change: "+12%", icon: Users, color: "text-blue-600" },
    { title: "Active Courses", value: "56", change: "+3%", icon: BookOpen, color: "text-green-600" },
    { title: "Enrollments", value: "3,456", change: "+18%", icon: Activity, color: "text-purple-600" },
    { title: "Revenue", value: "$45,678", change: "+8%", icon: DollarSign, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your learning management system
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {stat.change} from last month
              </p>
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
              {[
                "New user registered: john@example.com",
                "Course published: Introduction to React",
                "Instructor approved: Jane Smith",
                "System backup completed",
              ].map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  {activity}
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
                  className="rounded-lg border px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
