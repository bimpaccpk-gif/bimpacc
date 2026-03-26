"use client";

import { useState, useEffect, useCallback } from "react";
import { createLesson, deleteLesson, reorderLessons } from "@/app/actions/courses";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, Play, Clock, Video, FileText, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

interface InlineLessonManagerProps {
  courseId: string;
  subjectId?: string;
}

export function InlineLessonManager({ courseId, subjectId }: InlineLessonManagerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, [courseId, subjectId]);

  const fetchLessons = async () => {
    setLoading(true);
    const supabase = createClient();
    
    let query = supabase
      .from("lessons")
      .select("id, title, description, video_url, duration_minutes, order_index")
      .order("order_index", { ascending: true });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    } else {
      query = query.eq("course_id", courseId);
    }

    const { data } = await query;
    setLessons(data || []);
    setLoading(false);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    const formData = new FormData();
    formData.append("courseId", courseId);
    if (subjectId) formData.append("subjectId", subjectId);
    formData.append("title", newTitle.trim());
    if (newVideoUrl.trim()) formData.append("videoUrl", newVideoUrl.trim());
    if (newDuration) formData.append("durationMinutes", newDuration);

    const result = await createLesson(undefined, formData);
    
    if (result.success && result.lesson) {
      setLessons([...lessons, result.lesson as Lesson]);
      setNewTitle("");
      setNewVideoUrl("");
      setNewDuration("");
      // Intentionally not hiding form so user can rapid-fire add lessons
    }
    setAdding(false);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const formData = new FormData();
    formData.append("lessonId", lessonId);
    formData.append("courseId", courseId);
    if (subjectId) formData.append("subjectId", subjectId);

    await deleteLesson(undefined, formData);
    setLessons(lessons.filter(l => l.id !== lessonId));
  };

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // Optimistically reorder state
    const newLessons = Array.from(lessons);
    const [reorderedItem] = newLessons.splice(sourceIndex, 1);
    newLessons.splice(destinationIndex, 0, reorderedItem);

    // Update index virtually
    const updates = newLessons.map((l, idx) => ({
      ...l,
      order_index: idx + 1,
    }));
    
    setLessons(updates);

    // Persist to server
    const revalidateUrl = subjectId 
      ? `/admin/courses/${courseId}/subjects/${subjectId}/lessons` 
      : `/admin/courses/${courseId}/lessons`;

    await reorderLessons(
      revalidateUrl,
      updates.map((u) => ({ id: u.id, order_index: u.order_index }))
    );
  }, [lessons, courseId, subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {lessons.length} {lessons.length === 1 ? "Lesson" : "Lessons"}
          </span>
        </div>
      </div>

      {/* Top Add Button */}
      {!showAddForm && lessons.length > 0 && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full h-10 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson
        </Button>
      )}

      {/* Lesson List */}
      <div className="space-y-2">
        {lessons.length > 0 && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`lessons-list-${subjectId || courseId}`}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {lessons.map((lesson, index) => (
                    <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                      {(provided, snapshot) => {
                        const draggableContent = (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "group flex items-center gap-3 rounded-lg border bg-card p-3",
                              snapshot.isDragging 
                                ? "shadow-lg ring-2 ring-primary scale-[1.02] bg-background/95 backdrop-blur-sm will-change-transform" 
                                : "hover:shadow-sm hover:border-primary/30 transition-[shadow,border-color] duration-200"
                            )}
                            style={{
                              ...provided.draggableProps.style,
                              ...(snapshot.isDragging ? { zIndex: 99999 } : {}),
                            }}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing hover:bg-muted p-1 rounded transition-colors"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-foreground" />
                            </div>
                            
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{lesson.title}</p>
                              <div className="mt-1 flex items-center gap-3">
                                {lesson.video_url && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                    <Video className="h-3 w-3" />
                                    Video
                                  </span>
                                )}
                                {lesson.duration_minutes && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {lesson.duration_minutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );

                        // Portal dragged items to body so they escape dialog's transform/overflow
                        if (snapshot.isDragging) {
                          return createPortal(draggableContent, document.body);
                        }
                        return draggableContent;
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Empty State */}
      {lessons.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
          <Video className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No lessons yet</p>
        </div>
      )}

      {/* Add Lesson Form */}
      {showAddForm ? (
        <form onSubmit={handleAddLesson} className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Lesson title *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="h-10 bg-background"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Video URL (optional)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="h-10 bg-background"
              />
              <Input
                placeholder="Duration (minutes)"
                type="number"
                min="1"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="h-10 bg-background"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!newTitle.trim() || adding} className="flex-1 h-10">
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
                setNewVideoUrl("");
                setNewDuration("");
              }}
              className="h-10 px-4"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full h-10 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Lesson
        </Button>
      )}
    </div>
  );
}
