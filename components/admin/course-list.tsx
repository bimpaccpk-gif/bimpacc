"use client";

import { useState } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { CourseCreateDialog } from "@/components/admin/course-create-dialog";
import { CourseDeleteButton } from "@/components/admin/course-delete-button";
import { getHierarchyConfig } from "@/lib/hierarchy-config";
import { HierarchyType } from "@/types";
import { cn } from "@/lib/utils";
import { reorderCourses } from "@/app/actions/courses";
import { Sparkles, Layers, List, BookOpen, Activity, Calendar, ArrowRight, GripVertical } from "lucide-react";

export interface CourseRow {
  id: string;
  title: string;
  description: string;
  status: string;
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
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 ring-1 ring-zinc-500/20",
    dotClass: "bg-zinc-500",
  },
  published: {
    label: "Published",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-500/20",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  archived: {
    label: "Archived",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-500/20",
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
  { type: 3 as HierarchyType, title: "Lesson Hierarchy" }
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getManageLink(courseId: string, hierarchyType: HierarchyType): string {
  switch (hierarchyType) {
    case 1:
      return `/admin/courses/${courseId}/subjects`;
    case 2:
    case 3:
      return `/admin/courses/${courseId}/lessons`;
    default:
      return `/admin/courses/${courseId}/subjects`;
  }
}

function getManageButtonText(hierarchyType: HierarchyType): string {
  switch (hierarchyType) {
    case 1:
      return "Manage Subjects";
    case 2:
    case 3:
      return "Manage Lessons";
    default:
      return "Manage Content";
  }
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

  const handleDragEnd = async (result: DropResult, hierarchyType: HierarchyType) => {
    if (!result.destination) return;
    
    // Process only items belonging to this specific hierarchy group
    const typeCourses = courses.filter(c => c.hierarchy_type === hierarchyType);
    
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
    setCourses(prev => prev.map(c => {
      const update = updates.find(u => u.id === c.id);
      return update ? update : c;
    }));

    // Persist batch to server
    await reorderCourses(
      updates.map((u) => ({ id: u.id, order_index: u.order_index! }))
    );
  };

  if (courses.length === 0) {
    return (
      <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/10 px-6 py-24 backdrop-blur-sm animate-in zoom-in-95 duration-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20 group hover:scale-105 transition-transform duration-500">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h3 className="relative z-10 mt-6 text-2xl font-semibold tracking-tight">Create your first course</h3>
        <p className="relative z-10 mt-2 text-center text-muted-foreground max-w-sm mb-6">
          Get started by designing a new course. Choose from versatile hierarchy structures to best organize your content.
        </p>
        <div className="relative z-10 group">
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
          <div key={group.type} className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground/90 pl-1">
              {group.title}
            </h2>
            <DragDropContext onDragEnd={(result) => handleDragEnd(result, group.type)}>
              <Droppable droppableId={`courses-list-${group.type}`}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
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
                                "group relative flex flex-col sm:flex-row sm:items-center gap-5 overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-zinc-950/60 p-4 backdrop-blur-xl transition-all duration-300",
                                snapshot.isDragging 
                                  ? "shadow-2xl ring-2 ring-indigo-500 scale-[1.02] z-50 bg-background/95" 
                                  : "shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                              )}
                              style={provided.draggableProps.style}
                            >
                              {/* Left Edge Accent */}
                              <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-purple-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                              
                              {/* Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="pl-2 pr-1 cursor-grab active:cursor-grabbing hover:bg-indigo-500/10 rounded-lg p-2 transition-colors -ml-1"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-indigo-500" />
                              </div>

                              {/* Icon Container */}
                              <div className="hidden sm:flex shrink-0 h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                                {hierarchyIcons[course.hierarchy_type]}
                              </div>

                              {/* Main Details (Title, Description) */}
                              <div className="flex-1 min-w-0 pr-4 sm:ml-0 ml-4 py-1">
                                <div className="flex items-center gap-2 mb-1 sm:hidden">
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold shadow-sm",
                                      status.className
                                    )}
                                  >
                                    <span className={cn("relative flex h-1.5 w-1.5 rounded-full", status.dotClass)} />
                                    {status.label}
                                  </span>
                                </div>
                                <h3 className="font-bold text-xl truncate tracking-tight text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {course.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground/80 truncate leading-relaxed max-w-2xl">
                                  {course.description || "No description provided."}
                                </p>
                                
                                {/* Inline Stats for Mobile */}
                                <div className="flex sm:hidden items-center gap-4 mt-3 text-xs font-semibold text-muted-foreground/80">
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="h-4 w-4 text-indigo-500" />
                                    <span>{itemCounts[course.id] ?? 0} {course.hierarchy_type === 1 ? 'Subjects' : 'Lessons'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                    <span>{config.name} Setup</span>
                                  </div>
                                </div>
                              </div>

                              {/* Badges / Stats (Desktop) */}
                              <div className="hidden sm:flex flex-col items-start xl:items-end justify-center gap-2 shrink-0 w-48 border-l border-border/50 pl-6 border-dashed">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-sm",
                                    status.className
                                  )}
                                >
                                  <span className={cn("relative flex h-1.5 w-1.5 rounded-full", status.dotClass)} />
                                  {status.label}
                                </span>
                                
                                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground/80">
                                  <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-md border border-border/50" title={`${itemCounts[course.id] ?? 0} active content items`}>
                                    <Activity className="h-3 w-3 text-indigo-500" />
                                    <span>{itemCounts[course.id] ?? 0} {course.hierarchy_type === 1 ? 'Subj' : 'Less.'}</span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-md border border-border/50" title={`Created on ${formatDate(course.created_at)}`}>
                                    <Calendar className="h-3 w-3 text-purple-500" />
                                    <span>{new Date(course.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="shrink-0 flex items-center gap-2 p-1 pl-4 sm:pl-2">
                                <Link href={getManageLink(course.id, course.hierarchy_type)} className="w-[160px] sm:w-[150px]">
                                  <Button className="w-full h-11 rounded-xl bg-gradient-to-r hover:from-indigo-600 hover:to-purple-700 bg-primary text-white shadow-md shadow-indigo-500/10 transition-all active:scale-[0.98] group/btn font-semibold">
                                    {getManageButtonText(course.hierarchy_type)}
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                  </Button>
                                </Link>
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
