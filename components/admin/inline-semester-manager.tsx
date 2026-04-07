"use client";

import { useState, useEffect, useCallback } from "react";
import { createSemester, deleteSemester, reorderSemesters } from "@/app/actions/courses";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, CalendarRange, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { InlineSubjectManager } from "./inline-subject-manager";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

interface Semester {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

interface InlineSemesterManagerProps {
  courseId: string;
  initialSemesters?: Semester[];
}

export function InlineSemesterManager({ courseId, initialSemesters }: InlineSemesterManagerProps) {
  const [semesters, setSemesters] = useState(initialSemesters ?? []);
  const [loading, setLoading] = useState(!initialSemesters);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSemesters) return;
    const fetchSemesters = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("semesters")
        .select("id, title, description, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      setSemesters(data ?? []);
      setLoading(false);
    };
    fetchSemesters();
  }, [courseId, initialSemesters]);

  const handleAddSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("courseId", courseId);
    formData.append("title", newTitle.trim());

    const result = await createSemester(undefined, formData);
    setIsSubmitting(false);

    if (result.success && result.semester) {
      setSemesters([...semesters, result.semester as Semester]);
      setNewTitle("");
      setShowAddForm(false);
      setExpandedSemesters(new Set([...expandedSemesters, result.semester.id]));
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleDeleteSemester = async (semesterId: string) => {
    const formData = new FormData();
    formData.append("semesterId", semesterId);
    formData.append("courseId", courseId);

    await deleteSemester(undefined, formData);
    setSemesters(semesters.filter((s) => s.id !== semesterId));
    setExpandedSemesters((prev) => {
      const next = new Set(prev);
      next.delete(semesterId);
      return next;
    });
  };

  const toggleExpand = (semesterId: string) => {
    setExpandedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(semesterId)) {
        next.delete(semesterId);
      } else {
        next.add(semesterId);
      }
      return next;
    });
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newSemesters = Array.from(semesters);
    const [reorderedItem] = newSemesters.splice(sourceIndex, 1);
    newSemesters.splice(destinationIndex, 0, reorderedItem);

    const updates = newSemesters.map((s, idx) => ({
      ...s,
      order_index: idx + 1,
    }));

    setSemesters(updates);

    await reorderSemesters(
      courseId,
      updates.map((u) => ({ id: u.id, order_index: u.order_index }))
    );
  }, [semesters, courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showAddForm && semesters.length > 0 && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full h-10 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Semester
        </Button>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="semesters-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {semesters.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <CalendarRange className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No semesters yet</h3>
                  <p className="mt-1 text-center text-sm text-muted-foreground max-w-sm">
                    Start by adding your first semester. Each semester can contain subjects and lessons.
                  </p>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="mt-6"
                    size="lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Semester
                  </Button>
                </div>
              ) : (
                semesters.map((semester, index) => (
                  <Draggable key={semester.id} draggableId={semester.id} index={index}>
                    {(provided, snapshot) => {
                      const draggableContent = (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "group rounded-xl border bg-card",
                            snapshot.isDragging
                              ? "shadow-lg ring-2 ring-primary scale-[1.02] bg-background/95 backdrop-blur-sm will-change-transform"
                              : expandedSemesters.has(semester.id)
                                ? "shadow-md ring-1 ring-primary/10 transition-[shadow,border-color] duration-200"
                                : "hover:shadow-sm hover:border-primary/30 transition-[shadow,border-color] duration-200"
                          )}
                          style={{
                            ...provided.draggableProps.style,
                            ...(snapshot.isDragging ? { zIndex: 99999 } : {}),
                          }}
                        >
                          <div className="flex items-center gap-3 p-4">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing hover:bg-muted p-1 rounded transition-colors"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-foreground" />
                            </div>

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                              {index + 1}
                            </div>
                            <button
                              onClick={() => toggleExpand(semester.id)}
                              className="flex flex-1 items-center gap-3 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{semester.title}</p>
                                {semester.description && (
                                  <p className="text-sm text-muted-foreground truncate">{semester.description}</p>
                                )}
                              </div>
                              <div className={cn(
                                "flex items-center justify-center h-6 w-6 rounded-full transition-colors",
                                expandedSemesters.has(semester.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {expandedSemesters.has(semester.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSemester(semester.id)}
                              className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {expandedSemesters.has(semester.id) && (
                            <div className="border-t bg-muted/30 p-5">
                              <div className="rounded-lg bg-background p-4 shadow-sm border border-border/50">
                                <InlineSubjectManager
                                  courseId={courseId}
                                  semesterId={semester.id}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );

                      if (snapshot.isDragging) {
                        return createPortal(draggableContent, document.body);
                      }
                      return draggableContent;
                    }}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showAddForm ? (
        <form onSubmit={handleAddSemester} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          {error && (
            <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive dark:bg-destructive/20 dark:text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <Input
              placeholder="Enter semester title..."
              value={newTitle}
              onChange={(e) => { setNewTitle(e.target.value); setError(null); }}
              autoFocus
              className="flex-1 h-11 bg-background"
            />
            <Button type="submit" disabled={!newTitle.trim() || isSubmitting} className="h-11 px-6">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Semester
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
                setError(null);
              }}
              className="h-11 px-4"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full h-12 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Semester
        </Button>
      )}
    </div>
  );
}
