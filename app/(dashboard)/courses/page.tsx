import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search, Star } from "lucide-react";

export default function CoursesPage() {
  const courses = [
    {
      id: "1",
      title: "Introduction to React",
      description: "Learn the fundamentals of React including components, hooks, and state management.",
      instructor: "John Doe",
      students: 124,
      rating: 4.8,
      price: 49.99,
    },
    {
      id: "2",
      title: "Advanced TypeScript",
      description: "Deep dive into TypeScript generics, utility types, and advanced patterns.",
      instructor: "Jane Smith",
      students: 89,
      rating: 4.7,
      price: 59.99,
    },
    {
      id: "3",
      title: "Node.js Fundamentals",
      description: "Build server-side applications with Node.js, Express, and MongoDB.",
      instructor: "Alex Johnson",
      students: 67,
      rating: 4.9,
      price: 54.99,
    },
    {
      id: "4",
      title: "Python for Data Science",
      description: "Master Python programming for data analysis, visualization, and machine learning.",
      instructor: "Sarah Wilson",
      students: 203,
      rating: 4.6,
      price: 69.99,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse our catalog of courses
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search courses..."
            className="w-full pl-10 sm:w-64"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden transition-shadow hover:shadow-md">
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600" />
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-1 text-lg">{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {course.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{course.students} students</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {course.rating}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${course.price}
                </span>
                <Link href={`/courses/${course.id}`}>
                  <Button size="sm">View Course</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
