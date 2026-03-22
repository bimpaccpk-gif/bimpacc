import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

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
      thumbnail: null,
    },
    {
      id: "2",
      title: "Advanced TypeScript",
      description: "Deep dive into TypeScript generics, utility types, and advanced patterns.",
      instructor: "Jane Smith",
      students: 89,
      rating: 4.7,
      price: 59.99,
      thumbnail: null,
    },
    {
      id: "3",
      title: "Node.js Fundamentals",
      description: "Build server-side applications with Node.js, Express, and MongoDB.",
      instructor: "Alex Johnson",
      students: 67,
      rating: 4.9,
      price: 54.99,
      thumbnail: null,
    },
    {
      id: "4",
      title: "Python for Data Science",
      description: "Master Python programming for data analysis, visualization, and machine learning.",
      instructor: "Sarah Wilson",
      students: 203,
      rating: 4.6,
      price: 69.99,
      thumbnail: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse our catalog of courses
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search courses..."
            className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {course.rating}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${course.price}
                </span>
                <Link
                  href={`/courses/${course.id}`}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Course
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
