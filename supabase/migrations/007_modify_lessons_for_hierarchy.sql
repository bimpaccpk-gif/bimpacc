-- Modify lessons table to support different hierarchy types
-- Add course_id column for hierarchy types 2 and 3
alter table public.lessons 
add column course_id uuid references public.courses(id) on delete cascade;

-- Make subject_id nullable for hierarchy types 2 and 3
alter table public.lessons 
alter column subject_id drop not null;

-- Add constraint to ensure either subject_id or course_id is set
-- but not both (except for hierarchy type 1 which uses subject_id)
alter table public.lessons 
add constraint lessons_parent_check 
check (
  (subject_id is not null and course_id is null) or 
  (subject_id is null and course_id is not null)
);

-- Create indexes for better query performance
create index idx_lessons_course_id on public.lessons(course_id);
create index idx_lessons_subject_id on public.lessons(subject_id);

-- Update RLS policies to handle both relationships
-- The existing policies should work since they check authentication
-- but we might need to add more specific policies later if needed

-- Add comment explaining the hierarchy structure
comment on column public.lessons.course_id is 
'Used for hierarchy types 2 and 3 where lessons belong directly to courses';
comment on column public.lessons.subject_id is 
'Used for hierarchy type 1 where lessons belong to subjects';
