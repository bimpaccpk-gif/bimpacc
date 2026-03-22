import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, CheckCircle, Clock, Award, Star } from "lucide-react";

export default function StudentDashboardPage() {
  const stats = [
    {
      title: "Enrolled Courses",
      value: "4",
      icon: BookOpen,
      bgColor: "bg-brand-50 dark:bg-brand-950",
      iconColor: "text-brand-600 dark:text-brand-400",
    },
    {
      title: "Completed",
      value: "2",
      icon: CheckCircle,
      bgColor: "bg-success/10",
      iconColor: "text-success",
    },
    {
      title: "In Progress",
      value: "2",
      icon: Clock,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      title: "Certificates",
      value: "2",
      icon: Award,
      bgColor: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Student Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your learning progress and continue your courses
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
            <CardTitle className="text-lg">Continue Learning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: "Introduction to React",
                  progress: 75,
                  lesson: "State Management",
                },
                {
                  title: "Advanced TypeScript",
                  progress: 30,
                  lesson: "Generics",
                },
              ].map((course) => (
                <div key={course.title} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">
                      {course.title}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next: {course.lesson}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  title: "Node.js Fundamentals",
                  instructor: "John Doe",
                  rating: 4.9,
                },
                {
                  title: "Python for Data Science",
                  instructor: "Jane Smith",
                  rating: 4.7,
                },
                {
                  title: "UI/UX Design Basics",
                  instructor: "Alex Johnson",
                  rating: 4.8,
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
                      by {course.instructor}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-warning">
                    <Star className="h-4 w-4 fill-current" />
                    {course.rating}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
