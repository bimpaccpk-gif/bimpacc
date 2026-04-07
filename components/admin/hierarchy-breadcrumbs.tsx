"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HierarchyType } from "@/types";
import { getHierarchyConfig } from "@/lib/hierarchy-config";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HierarchyBreadcrumbsProps {
  courseId: string;
  courseTitle: string;
  hierarchyType: HierarchyType;
  subjectId?: string;
  subjectTitle?: string;
  semesterId?: string;
  semesterTitle?: string;
  currentLevel: "course" | "semester" | "subject" | "lesson";
}

export function HierarchyBreadcrumbs({
  courseId,
  courseTitle,
  hierarchyType,
  subjectId,
  subjectTitle,
  semesterId,
  semesterTitle,
  currentLevel,
}: HierarchyBreadcrumbsProps) {
  const config = getHierarchyConfig(hierarchyType);

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Courses", href: "/admin/courses" }
    ];

    switch (hierarchyType) {
      case 1: // Course → Semester → Subject → Lesson
        if (currentLevel === "course") {
          breadcrumbs.push({ label: courseTitle });
        } else if (currentLevel === "semester") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/semesters` });
          breadcrumbs.push({ label: semesterTitle || "Semester" });
        } else if (currentLevel === "subject") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/semesters` });
          breadcrumbs.push({ label: semesterTitle || "Semester", href: `/admin/courses/${courseId}/semesters/${semesterId}` });
          breadcrumbs.push({ label: subjectTitle || "Subject" });
        } else if (currentLevel === "lesson") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/semesters` });
          breadcrumbs.push({ label: semesterTitle || "Semester", href: `/admin/courses/${courseId}/semesters/${semesterId}` });
          breadcrumbs.push({ label: subjectTitle || "Subject", href: `/admin/courses/${courseId}/semesters/${semesterId}/subjects/${subjectId}/lessons` });
          breadcrumbs.push({ label: "Lessons" });
        }
        break;

      case 2: // Course → Subject → Lesson
        if (currentLevel === "course") {
          breadcrumbs.push({ label: courseTitle });
        } else if (currentLevel === "subject") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/subjects` });
          breadcrumbs.push({ label: subjectTitle || "Subject" });
        } else if (currentLevel === "lesson") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/subjects` });
          breadcrumbs.push({ label: subjectTitle || "Subject", href: `/admin/courses/${courseId}/subjects/${subjectId}/lessons` });
          breadcrumbs.push({ label: "Lessons" });
        }
        break;

      case 3: // Lesson only
        if (currentLevel === "course") {
          breadcrumbs.push({ label: courseTitle });
        } else if (currentLevel === "lesson") {
          breadcrumbs.push({ label: courseTitle, href: `/admin/courses/${courseId}/lessons` });
          breadcrumbs.push({ label: "Lessons" });
        }
        break;
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
