"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";
import { ManageContentDialog } from "@/components/admin/manage-content-dialog";
import { CourseAccessDialog } from "@/components/admin/course-access-dialog";
import { EnrolledStudentsDialog } from "@/components/admin/enrolled-students-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { getCourseAccent } from "@/lib/course-accent";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";
import { reorderCourses } from "@/app/actions/courses";
import { Layers, ListTree, BookOpen, GripVertical, CalendarDays, GraduationCap } from "lucide-react";

export interface CourseRow {
  id: string;
  title: string;
  description: string;
  batch: string;
  status: string;
  registration_open: boolean;
  price: number | null;
  hierarchy_type: HierarchyType;
  created_at: string;
  order_index?: number;
}

interface CourseListProps {
  initialCourses: CourseRow[];
  itemCounts: Record<string, { semesters: number; subjects: number; lessons: number }>;
  enrollmentCounts: Record<string, number>;
}

const statusVariant: Record<string, "success" | "secondary" | "warning"> = {
  published: "success",
  draft: "secondary",
  archived: "warning",
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const hierarchyGroups: Array<{
  type: HierarchyType;
  label: string;
  detail: string;
  icon: React.ReactNode;
}> = [
  {
    type: 1,
    label: "Full structure",
    detail: "Semesters → Subjects → Lessons",
    icon: <Layers />,
  },
  {
    type: 2,
    label: "Standard",
    detail: "Subjects → Lessons",
    icon: <ListTree />,
  },
  {
    type: 3,
    label: "Simple",
    detail: "Lessons only",
    icon: <BookOpen />,
  },
];

// Sort courses by order_index primarily, then fallback to creation date (handled by server query initially)
function sortCourses(courses: CourseRow[]): CourseRow[] {
  return [...courses].sort((a, b) => {
    const aOrder = a.order_index ?? 0;
    const bOrder = b.order_index ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function contentSummary(
  course: CourseRow,
  counts: { semesters: number; subjects: number; lessons: number } | undefined
) {
  if (!counts) return "0 lessons";
  const parts: string[] = [];
  if (course.hierarchy_type === 1) parts.push(`${counts.semesters} semesters`, `${counts.subjects} subjects`);
  if (course.hierarchy_type === 2) parts.push(`${counts.subjects} subjects`);
  parts.push(`${counts.lessons} lessons`);
  return parts.join(" · ");
}

export function CourseList({ initialCourses, itemCounts, enrollmentCounts }: CourseListProps) {
  const [courses, setCourses] = useState(() => sortCourses(initialCourses));

  // Re-sort when the server sends fresh rows (e.g. after router.refresh()) —
  // adjusted during render instead of in an effect to avoid cascading renders.
  const [lastInitialCourses, setLastInitialCourses] = useState(initialCourses);
  if (lastInitialCourses !== initialCourses) {
    setLastInitialCourses(initialCourses);
    setCourses(sortCourses(initialCourses));
  }

  const handleDragEnd = useCallback(
    async (result: DropResult, hierarchyType: HierarchyType) => {
      if (!result.destination) return;

      // Process only items belonging to this specific hierarchy group
      const typeCourses = courses.filter((c) => c.hierarchy_type === hierarchyType);

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) return;

      // Optimistically reorder within the filtered group
      const newTypeCourses = Array.from(typeCourses);
      const [reorderedItem] = newTypeCourses.splice(sourceIndex, 1);
      newTypeCourses.splice(destinationIndex, 0, reorderedItem);

      // Give them new sequential orders naturally based on their filtered array
      const updates = newTypeCourses.map((c, idx) => ({
        ...c,
        order_index: idx + 1,
      }));

      // Merge back into the master array
      setCourses((prev) =>
        prev.map((c) => {
          const update = updates.find((u) => u.id === c.id);
          return update ? update : c;
        })
      );

      // Persist batch to server - use current state to avoid race condition
      try {
        await reorderCourses(updates.map((u) => ({ id: u.id, order_index: u.order_index! })));
      } catch (error) {
        console.error("Failed to reorder courses:", error);
      }
    },
    [courses]
  );

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Create your first course"
        description="Design a new course and choose the hierarchy structure that fits how your content is organized."
        action={<CourseCreateDialog />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {hierarchyGroups.map((group) => {
        const groupCourses = courses.filter((c) => c.hierarchy_type === group.type);
        if (groupCourses.length === 0) return null;

        const totalStudents = groupCourses.reduce(
          (sum, c) => sum + (enrollmentCounts[c.id] ?? 0),
          0
        );

        return (
          <section key={group.type} className="flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-baseline gap-2 px-0.5">
              <span className="flex items-center gap-1.5 text-muted-foreground [&_svg]:size-3.5">
                {group.icon}
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {group.label}
              </h2>
              <span className="text-xs text-muted-foreground">{group.detail}</span>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {groupCourses.length} course{groupCourses.length !== 1 ? "s" : ""} ·{" "}
                {totalStudents} student{totalStudents !== 1 ? "s" : ""}
              </span>
            </div>

            <DragDropContext onDragEnd={(result) => handleDragEnd(result, group.type)}>
              <Droppable droppableId={`courses-list-${group.type}`}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-2">
                    {groupCourses.map((course, index) => {
                      const variant = statusVariant[course.status] ?? "secondary";
                      const label = statusLabel[course.status] ?? "Draft";
                      const accent = getCourseAccent(course.hierarchy_type);
                      const students = enrollmentCounts[course.id] ?? 0;

                      return (
                        <Draggable key={course.id} draggableId={course.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "group relative flex flex-col gap-4 rounded-xl border bg-card p-4 transition-[box-shadow,border-color] sm:flex-row sm:items-center",
                                snapshot.isDragging
                                  ? cn("z-50 shadow-lg ring-2 ring-ring", accent.draggingRing)
                                  : cn("hover:shadow-sm", accent.hoverBorder)
                              )}
                              style={provided.draggableProps.style}
                            >
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="-ml-2 cursor-grab rounded-md p-1.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-muted-foreground focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
                                aria-label="Drag to reorder"
                              >
                                <GripVertical className="size-4" />
                              </div>

                              {/* Hierarchy icon */}
                              <div
                                className={cn(
                                  "hidden size-10 shrink-0 items-center justify-center rounded-lg border sm:flex [&_svg]:size-4",
                                  accent.iconTile,
                                  accent.iconColor
                                )}
                              >
                                {group.icon}
                              </div>

                              {/* Title + meta */}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                                    {course.title}
                                  </h3>
                                  {course.batch && (
                                    <Badge variant="outline" className="px-1.5 py-0 text-[11px] font-medium uppercase">
                                      Batch {course.batch}
                                    </Badge>
                                  )}
                                  <Badge variant={variant}>{label}</Badge>
                                  {course.registration_open ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                                      <span className="relative flex size-1.5">
                                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                                        <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                                      </span>
                                      Enrolling
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <span className="size-1.5 rounded-full bg-border" />
                                      Closed
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                  {course.description || "No description provided."}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <GraduationCap className="size-3.5" />
                                    {students} student{students !== 1 ? "s" : ""}
                                  </span>
                                  <span>{contentSummary(course, itemCounts[course.id])}</span>
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="size-3.5" />
                                    {formatShortDate(course.created_at)}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 items-center gap-1 sm:ml-2">
                                <EnrolledStudentsDialog
                                  courseId={course.id}
                                  courseTitle={course.title}
                                  hierarchyType={course.hierarchy_type}
                                />
                                <CourseEditDialog
                                  courseId={course.id}
                                  initialTitle={course.title}
                                  initialDescription={course.description}
                                  initialBatch={course.batch}
                                  initialStatus={course.status}
                                  initialRegistrationOpen={course.registration_open}
                                  initialHierarchyType={course.hierarchy_type}
                                />
                                <CourseAccessDialog
                                  courseId={course.id}
                                  courseTitle={course.title}
                                  hierarchyType={course.hierarchy_type}
                                />
                                <CourseDeleteButton
                                  courseId={course.id}
                                  courseTitle={course.title}
                                />
                                <div aria-hidden className="mx-1.5 h-6 w-px bg-border" />
                                <div className="sm:w-auto">
                                  <ManageContentDialog
                                    courseId={course.id}
                                    courseTitle={course.title}
                                    hierarchyType={course.hierarchy_type}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </section>
        );
      })}
    </div>
  );
}
