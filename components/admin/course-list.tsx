"use client";

import { useState, useCallback, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseEditDialog } from "@/components/admin/course-edit-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";
import { ManageContentDialog } from "@/components/admin/manage-content-dialog";
import { CourseAccessDialog } from "@/components/admin/course-access-dialog";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";
import { reorderCourses } from "@/app/actions/courses";
import { Sparkles, Layers, List, BookOpen, Activity, Calendar, GripVertical } from "lucide-react";

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
  itemCounts: Record<string, number>;
}

const statusConfig: Record<string, { label: string; className: string; dotClass: string }> = {
  draft: {
    label: "Draft",
    className:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ring-1 ring-zinc-500/20",
    dotClass: "bg-zinc-500",
  },
  published: {
    label: "Published",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  archived: {
    label: "Archived",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-500/20",
    dotClass: "bg-amber-500",
  },
};

const hierarchyIcons: Record<number, React.ReactNode> = {
  1: <Layers className="h-6 w-6 text-indigo-500" />,
  2: <List className="h-6 w-6 text-indigo-500" />,
  3: <BookOpen className="h-6 w-6 text-indigo-500" />,
};

const hierarchyGroups = [
  { type: 1 as HierarchyType, title: "Course, Subject and Lesson Hierarchy" },
  { type: 2 as HierarchyType, title: "Subject and Lesson Hierarchy" },
  { type: 3 as HierarchyType, title: "Lesson Hierarchy" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CourseList({ initialCourses, itemCounts }: CourseListProps) {
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

      // Persist batch to server
      await reorderCourses(updates.map((u) => ({ id: u.id, order_index: u.order_index! })));
    },
    [courses]
  );

  if (courses.length === 0) {
    return (
      <div className="animate-in zoom-in-95 relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed border-indigo-500/30 bg-indigo-50/50 px-6 py-24 backdrop-blur-sm duration-700 dark:bg-indigo-950/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        <div className="group relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 transition-transform duration-500 hover:scale-105">
          <Sparkles className="h-10 w-10 text-white" />
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
                                "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/20 bg-white/60 p-4 backdrop-blur-xl sm:flex-row sm:items-center dark:border-white/10 dark:bg-zinc-950/60",
                                snapshot.isDragging
                                  ? "bg-background/95 z-50 scale-[1.02] shadow-2xl ring-2 ring-indigo-500 will-change-transform"
                                  : "shadow-sm transition-[shadow,border-color,opacity] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5"
                              )}
                              style={provided.draggableProps.style}
                            >
                              {/* Left Edge Accent */}
                              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-600 opacity-60 transition-opacity group-hover:opacity-100" />

                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="-ml-1 cursor-grab rounded-lg p-2 pr-1 pl-2 transition-colors hover:bg-indigo-500/10 active:cursor-grabbing"
                              >
                                <GripVertical className="text-muted-foreground/50 h-5 w-5 hover:text-indigo-500" />
                              </div>

                              {/* Icon Container */}
                              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/10 bg-indigo-500/10 transition-transform duration-300 group-hover:scale-110 sm:flex dark:bg-indigo-500/20">
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
                                  <h3 className="text-foreground truncate text-xl font-bold tracking-tight transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                    {course.title}
                                  </h3>
                                  {course.batch && (
                                    <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-100 px-2 py-1 text-xs font-bold tracking-wider text-indigo-700 uppercase shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-900/30 dark:text-indigo-300">
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
                                    <Activity className="h-4 w-4 text-indigo-500" />
                                    <span>
                                      {itemCounts[course.id] ?? 0}{" "}
                                      {course.hierarchy_type === 1 ? "Subjects" : "Lessons"}
                                    </span>
                                  </div>
                                  <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1">
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
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold tracking-wider text-emerald-700 uppercase shadow-sm ring-1 ring-emerald-500/20 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    Enrolling
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold tracking-wider text-zinc-700 uppercase shadow-sm ring-1 ring-zinc-500/20 dark:bg-zinc-900/30 dark:text-zinc-300">
                                    Closed
                                  </span>
                                )}

                                <div className="text-muted-foreground/80 flex items-center gap-3 text-xs font-bold">
                                  <div
                                    className="bg-muted/40 border-border/50 flex items-center gap-1 rounded-md border px-2 py-1"
                                    title={`${itemCounts[course.id] ?? 0} active content items`}
                                  >
                                    <Activity className="h-3 w-3 text-indigo-500" />
                                    <span>
                                      {itemCounts[course.id] ?? 0}{" "}
                                      {course.hierarchy_type === 1 ? "Subj" : "Less."}
                                    </span>
                                  </div>
                                  <div
                                    className="bg-muted/40 border-border/50 flex items-center gap-1 rounded-md border px-2 py-1"
                                    title={`Created on ${formatDate(course.created_at)}`}
                                  >
                                    <Calendar className="h-3 w-3 text-purple-500" />
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
                                <CourseEditDialog
                                  courseId={course.id}
                                  initialTitle={course.title}
                                  initialDescription={course.description}
                                  initialBatch={course.batch}
                                  initialStatus={course.status}
                                  initialRegistrationOpen={course.registration_open}
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
