"use client";

import { useState, useActionState } from "react";
import { createSubject, deleteSubject, reorderSubjects } from "@/app/actions/courses";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, BookOpen, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { InlineLessonManager } from "./inline-lesson-manager";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Subject {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

interface InlineSubjectManagerProps {
  courseId: string;
  initialSubjects: Subject[];
}

export function InlineSubjectManager({ courseId, initialSubjects }: InlineSubjectManagerProps) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [deleteState, deleteAction, deletePending] = useActionState(deleteSubject, undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("courseId", courseId);
    formData.append("title", newTitle.trim());

    const result = await createSubject(undefined, formData);
    setIsSubmitting(false);
    
    if (result.success && result.subject) {
      setSubjects([...subjects, result.subject as Subject]);
      setNewTitle("");
      setShowAddForm(false);
      setExpandedSubjects(new Set([...expandedSubjects, result.subject.id])); // Auto-expand
    } else if (result.error) {
      setError(result.error);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const formData = new FormData();
    formData.append("subjectId", subjectId);
    formData.append("courseId", courseId);

    await deleteSubject(undefined, formData);
    setSubjects(subjects.filter(s => s.id !== subjectId));
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      next.delete(subjectId);
      return next;
    });
  };

  const toggleExpand = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // Optimistically reorder state
    const newSubjects = Array.from(subjects);
    const [reorderedItem] = newSubjects.splice(sourceIndex, 1);
    newSubjects.splice(destinationIndex, 0, reorderedItem);

    // Update index virtually
    const updates = newSubjects.map((s, idx) => ({
      ...s,
      order_index: idx + 1,
    }));
    
    setSubjects(updates);

    // Persist to server
    await reorderSubjects(
      courseId,
      updates.map((u) => ({ id: u.id, order_index: u.order_index }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Subject List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subjects-list">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {subjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-12">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No subjects yet</h3>
                  <p className="mt-1 text-center text-sm text-muted-foreground max-w-sm">
                    Start building your course by adding your first subject. Each subject can contain multiple lessons.
                  </p>
                  <Button
                    onClick={() => setShowAddForm(true)}
                    className="mt-6"
                    size="lg"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Subject
                  </Button>
                </div>
              ) : (
                subjects.map((subject, index) => (
                  <Draggable key={subject.id} draggableId={subject.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "group rounded-xl border bg-card transition-all duration-200",
                          snapshot.isDragging 
                            ? "shadow-lg ring-2 ring-primary scale-[1.02] z-50 bg-background/90 backdrop-blur-sm" 
                            : expandedSubjects.has(subject.id) 
                              ? "shadow-md ring-1 ring-primary/10" 
                              : "hover:shadow-sm hover:border-primary/30"
                        )}
                        style={provided.draggableProps.style}
                      >
                        {/* Subject Header */}
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
                            onClick={() => toggleExpand(subject.id)}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{subject.title}</p>
                              {subject.description && (
                                <p className="text-sm text-muted-foreground truncate">{subject.description}</p>
                              )}
                            </div>
                            <div className={cn(
                              "flex items-center justify-center h-6 w-6 rounded-full transition-colors",
                              expandedSubjects.has(subject.id) 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {expandedSubjects.has(subject.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubject(subject.id)}
                            className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Expandable Lessons Section */}
                        {expandedSubjects.has(subject.id) && (
                          <div className="border-t bg-muted/30 p-5">
                            <div className="rounded-lg bg-background p-4 shadow-sm border border-border/50">
                              <InlineLessonManager
                                courseId={courseId}
                                subjectId={subject.id}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Subject Form */}
      {showAddForm ? (
        <form onSubmit={handleAddSubject} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <Input
              placeholder="Enter subject title..."
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
                  Add Subject
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
          Add Subject
        </Button>
      )}
    </div>
  );
}
