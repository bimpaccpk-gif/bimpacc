-- Migration 035: Add semester locking capabilities
-- 1. Add is_paused to semesters table
-- 2. Update student_content_access.content_type check constraint

-- ── 1. Add is_paused to semesters ────────────────────────────

ALTER TABLE public.semesters
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Update content_type constraint ────────────────────────

-- Drop the old check constraint
ALTER TABLE public.student_content_access 
  DROP CONSTRAINT IF EXISTS student_content_access_content_type_check;

-- Add the new check constraint to include 'semester'
ALTER TABLE public.student_content_access 
  ADD CONSTRAINT student_content_access_content_type_check 
  CHECK (content_type IN ('course', 'semester', 'subject', 'lesson'));

