"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BookOpen, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CourseAccessTree } from "./course-access-tree";
import {
  getStudentEnrolledCourses,
  getSimplifiedAccessTree,
  type AccessTreeNode,
} from "@/app/actions/access-control";

interface CourseOption {
  id: string;
  title: string;
  hierarchyType: number;
}

interface EnrolledCourse {
  id: string;
  title: string;
  hierarchyType: number;
}

interface AccessControlPanelProps {
  userId: string;
  onAccessChange?: () => void;
}

export function AccessControlPanel({ userId, onAccessChange }: AccessControlPanelProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [accessTree, setAccessTree] = useState<AccessTreeNode | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingTree, setLoadingTree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, [userId]);

  useEffect(() => {
    if (selectedCourseId) {
      loadAccessTree(selectedCourseId);
    } else {
      setAccessTree(null);
    }
  }, [selectedCourseId, userId]);

  async function loadCourses() {
    setLoadingCourses(true);
    setError(null);
    try {
      const { data, error } = await getStudentEnrolledCourses(userId);
      if (error) {
        setError(error);
        return;
      }
      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadAccessTree(courseId: string) {
    setLoadingTree(true);
    setError(null);
    try {
      const { data, error } = await getSimplifiedAccessTree(userId, courseId);
      if (error) {
        setError(error);
        return;
      }
      setAccessTree(data);
    } finally {
      setLoadingTree(false);
    }
  }

  const handleRefresh = () => {
    loadCourses();
    if (selectedCourseId) {
      loadAccessTree(selectedCourseId);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  if (loadingCourses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading courses...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadCourses} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Content Access Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Student is not enrolled in any courses.</p>
            <p className="text-muted-foreground text-sm mt-1">
              Enroll the student in a course first to manage content access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Content Access Control
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-8">
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs transition-all outline-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 w-[200px]"
              >
                <span className="truncate">{selectedCourse?.title || "Select course"}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                {courses.map((course) => (
                  <DropdownMenuItem
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={cn(
                      "cursor-pointer",
                      selectedCourseId === course.id && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{course.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {course.hierarchyType === 1 && "Course → Semester → Subject → Lesson"}
                        {course.hierarchyType === 2 && "Course → Subject → Lesson"}
                        {course.hierarchyType === 3 && "Course → Lesson"}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingTree ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading access tree...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => loadAccessTree(selectedCourseId!)} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : accessTree ? (
          <CourseAccessTree
            tree={accessTree}
            userId={userId}
            hierarchyType={selectedCourse?.hierarchyType ?? 1}
            onAccessChange={handleRefresh}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select a course to view access controls.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}