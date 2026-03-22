import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function InstructorDashboardPage() {
  const stats = [
    { title: "My Courses", value: "8", color: "text-blue-600" },
    { title: "Total Students", value: "456", color: "text-green-600" },
    { title: "Completion Rate", value: "78%", color: "text-purple-600" },
    { title: "Avg. Rating", value: "4.8", color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instructor Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your courses and track student progress
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
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
                { title: "Introduction to React", students: 124, status: "Published" },
                { title: "Advanced TypeScript", students: 89, status: "Published" },
                { title: "Node.js Fundamentals", students: 67, status: "Draft" },
              ].map((course) => (
                <div
                  key={course.title}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{course.title}</p>
                    <p className="text-sm text-gray-500">{course.students} students</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      course.status === "Published"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400"
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
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
