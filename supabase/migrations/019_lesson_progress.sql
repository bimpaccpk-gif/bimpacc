-- Migration: Lesson progress tracking
-- Allows students to track which lessons they have completed

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);

-- Indexes for performance
CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Students can read their own lesson progress
CREATE POLICY "Users can read own lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.id = lesson_progress.enrollment_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Students can insert their own lesson progress
CREATE POLICY "Users can insert own lesson progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.id = lesson_progress.enrollment_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Students can update their own lesson progress
CREATE POLICY "Users can update own lesson progress"
  ON public.lesson_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.id = lesson_progress.enrollment_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Admins can read all lesson progress
CREATE POLICY "Admins can read all lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (public.is_admin());
