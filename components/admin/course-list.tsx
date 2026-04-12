"use client";

import { useState, useCallback, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";
import { ManageContentDialog } from "@/components/admin/manage-content-dialog";
import { CourseAccessDialog } from "@/components/admin/course-access-dialog";
import { EnrolledStudentsDialog } from "@/components/admin/enrolled-students-dialog";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";
import { reorderCourses } from "@/app/actions/courses";
import { Sparkles, Layers, List, BookOpen, Activity, Calendar, GripVertical, Users } from "lucide-react";

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

const statusConfig: Record<string, { label: string; className: string; dotClass: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground ring-1 ring-border/20",
    dotClass: "bg-muted-foreground",
  },
  published: {
    label: "Published",
    className:
      "bg-success/10 text-success dark:bg-success/10 dark:text-success ring-1 ring-success/20",
    dotClass: "bg-success animate-pulse",
  },
  archived: {
    label: "Archived",
    className:
      "bg-warning/10 text-warning dark:bg-warning/10 dark:text-warning ring-1 ring-warning/20",
    dotClass: "bg-warning",
  },
};

const hierarchyIcons: Record<number, React.ReactNode> = {
  1: <Layers className="text-primary h-6 w-6" />,
  2: <List className="text-primary h-6 w-6" />,
  3: <BookOpen className="text-primary h-6 w-6" />,
};

const hierarchyGroups = [
  { type: 1 as HierarchyType, title: "Full Course Structure (Semesters → Subjects → Lessons)" },
  { type: 2 as HierarchyType, title: "Standard Course (Subjects → Lessons)" },
  { type: 3 as HierarchyType, title: "Simple Course (Lessons Only)" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CourseList({ initialCourses, itemCounts, enrollmentCounts }: CourseListProps) {
  // Sort courses by order_index primarily, then fallback to creation date (handled by server query initially)
  const [courses, setCourses] = useState(() => {
    return [...initialCourses].sort((a, b) => {
      const aOrder = a.order_index ?? 0;
      const bOrder = b.order_index ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Fallback to date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

  useEffect(() => {
    setCourses(
      [...initialCourses].sort((a, b) => {
        const aOrder = a.order_index ?? 0;
        const bOrder = b.order_index ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
    );
  }, [initialCourses]);

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
        // Revert on error by refetching
        console.error("Failed to reorder courses:", error);
        // The server will have the correct state, so we don't need to manually revert
      }
    },
    [courses]
  );

  if (courses.length === 0) {
    return (
      <div className="animate-in zoom-in-95 border-primary/30 bg-primary/5 dark:bg-primary/10 relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed px-6 py-24 backdrop-blur-sm duration-700">
        <div className="from-primary/10 pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent" />
        <div className="group from-primary to-primary/80 shadow-primary/20 relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br shadow-xl transition-transform duration-500 hover:scale-105">
          <Sparkles className="text-primary-foreground h-10 w-10" />
        </div>
        <h3 className="relative z-10 mt-6 text-2xl font-semibold tracking-tight">
          Create your first course
        </h3>
        <p className="text-muted-foreground relative z-10 mt-2 mb-6 max-w-sm text-center">
          Get started by designing a new course. Choose from versatile hierarchy structures to best
          organize your content.
        </p>
        <div className="group relative z-10">
          <CourseCreateDialog />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {hierarchyGroups.map((group) => {
        const groupCourses = courses.filter((c) => c.hierarchy_type === group.type);
        if (groupCourses.length === 0) return null;

        return (
          <div
            key={group.type}
            className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4"
          >
            <h2 className="text-foreground/90 pl-1 text-xl font-bold tracking-tight">
              {group.title}
            </h2>
            <DragDropContext onDragEnd={(result) => handleDragEnd(result, group.type)}>
              <Droppable droppableId={`courses-list-${group.type}`}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {groupCourses.map((course, index) => {
                      const status = statusConfig[course.status] ?? statusConfig.draft;
                      const config = getHierarchyConfig(course.hierarchy_type);

                      return (
                        <Draggable key={course.id} draggableId={course.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "group bg-background/60 dark:bg-card/60 relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/20 p-4 backdrop-blur-xl sm:flex-row sm:items-center dark:border-white/10",
                                snapshot.isDragging
                                  ? "bg-background/95 ring-primary z-50 scale-[1.02] shadow-2xl ring-2 will-change-transform"
                                  : "hover:shadow-primary/5 shadow-sm transition-[shadow,border-color,opacity] duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                              )}
                              style={provided.draggableProps.style}
                            >
                              {/* Left Edge Accent */}
                              <div className="from-primary to-primary/70 absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b opacity-60 transition-opacity group-hover:opacity-100" />

                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="hover:bg-primary/10 -ml-1 cursor-grab rounded-lg p-2 pr-1 pl-2 transition-colors active:cursor-grabbing"
                              >
                                <GripVertical className="text-muted-foreground/50 hover:text-primary h-5 w-5" />
                              </div>

                              {/* Icon Container */}
                              <div className="border-primary/10 bg-primary/10 dark:bg-primary/20 hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 sm:flex">
                                {hierarchyIcons[course.hierarchy_type]}
                              </div>

                              {/* Main Details (Title, Description) */}
                              <div className="ml-4 min-w-0 flex-1 py-1 pr-4 sm:ml-0">
                                <div className="mb-1 flex items-center gap-2 sm:hidden">
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-sm",
                                      status.className
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "relative flex h-1.5 w-1.5 rounded-full",
                                        status.dotClass
                                      )}
                                    />
                                    {status.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <h3 className="text-foreground group-hover:text-primary dark:group-hover:text-primary/80 truncate text-xl font-bold tracking-tight transition-colors">
                                    {course.title}
                                  </h3>
                                  {course.batch && (
                                    <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold tracking-wider text-primary uppercase shadow-sm ring-1 ring-primary/20 dark:bg-primary/20 dark:text-primary">
                                      Batch {course.batch}
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted-foreground/80 mt-1 max-w-2xl truncate text-sm leading-relaxed">
                                  {course.description || "No description provided."}
                                </p>

                                {/* Inline Stats for Mobile */}
                                <div className="text-muted-foreground/80 mt-3 flex items-center gap-4 text-xs font-semibold sm:hidden">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4 text-primary shrink-0" />
                                    <span>{enrollmentCounts[course.id] ?? 0} Students</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="h-4 w-4 text-primary shrink-0" />
                                    <span>
                                      {course.hierarchy_type === 1 && (
                                        <>{itemCounts[course.id]?.semesters ?? 0} Sem. • {itemCounts[course.id]?.subjects ?? 0} Subj. • </>
                                      )}
                                      {course.hierarchy_type === 2 && (
                                        <>{itemCounts[course.id]?.subjects ?? 0} Subj. • </>
                                      )}
                                      {itemCounts[course.id]?.lessons ?? 0} Lessons
                                    </span>
                                  </div>
                                  <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1 shrink-0">
                                    <span>{config.name} Setup</span>
                                  </div>
                                </div>
                              </div>

                              {/* Badges / Stats (Desktop) */}
                              <div className="border-border/50 hidden w-48 shrink-0 flex-col items-start justify-center gap-2 border-l border-dashed pl-6 sm:flex xl:items-end">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wider uppercase shadow-sm",
                                    status.className
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "relative flex h-1.5 w-1.5 rounded-full",
                                      status.dotClass
                                    )}
                                  />
                                  {status.label}
                                </span>
                                {course.registration_open ? (
                                  <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold tracking-wider text-success uppercase shadow-sm ring-1 ring-success/20 dark:bg-success/20 dark:text-success">
                                    Enrolling
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-bold tracking-wider text-muted-foreground uppercase shadow-sm ring-1 ring-border/20 dark:bg-muted/50 dark:text-muted-foreground">
                                    Closed
                                  </span>
                                )}

                                <div className="text-muted-foreground/80 flex flex-col items-end gap-2 text-[11px] font-bold mt-3 w-full">
                                  <div
                                    className="bg-muted/40 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-1 w-full justify-between"
                                    title="Enrolled Students"
                                  >
                                    <Users className="h-3 w-3 text-primary shrink-0" />
                                    <span className="truncate">
                                      {enrollmentCounts[course.id] ?? 0} Student{enrollmentCounts[course.id] !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <div
                                    className="bg-muted/40 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-1 w-full justify-between"
                                    title="Content Counts"
                                  >
                                    <Activity className="h-3 w-3 text-primary shrink-0" />
                                    <span className="truncate">
                                      {course.hierarchy_type === 1 && (
                                        <>{itemCounts[course.id]?.semesters ?? 0} Sem • {itemCounts[course.id]?.subjects ?? 0} Subj • </>
                                      )}
                                      {course.hierarchy_type === 2 && (
                                        <>{itemCounts[course.id]?.subjects ?? 0} Subj • </>
                                      )}
                                      {itemCounts[course.id]?.lessons ?? 0} Less.
                                    </span>
                                  </div>
                                  <div
                                    className="bg-muted/40 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-1 w-full justify-between"
                                    title={`Created on ${formatDate(course.created_at)}`}
                                  >
                                    <Calendar className="h-3 w-3 text-primary shrink-0" />
                                    <span>
                                      {new Date(course.created_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 items-center gap-2 p-1 pl-4 sm:pl-2">
                                <EnrolledStudentsDialog
                                  courseId={course.id}
                                  courseTitle={course.title}
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
                                <div className="w-[160px] sm:w-[150px]">
                                  <ManageContentDialog
                                    courseId={course.id}
                                    courseTitle={course.title}
                                    hierarchyType={course.hierarchy_type}
                                  />
                                </div>
                                <CourseAccessDialog
                                  courseId={course.id}
                                  courseTitle={course.title}
                                />
                                <CourseDeleteButton
                                  courseId={course.id}
                                  courseTitle={course.title}
                                />
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
          </div>
        );
      })}
    </div>
  );
}
