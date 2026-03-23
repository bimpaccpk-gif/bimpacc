-- Add hierarchy_type column to courses table
-- 1: Course → Subject → Lesson (default)
-- 2: Subject → Lesson  
-- 3: Lesson only
alter table public.courses 
add column hierarchy_type integer not null default 1 
check (hierarchy_type in (1, 2, 3));

-- Add comment for clarity
comment on column public.courses.hierarchy_type is 
'1: Course→Subject→Lesson, 2: Subject→Lesson, 3: Lesson only';

-- Create index for better query performance on hierarchy_type
create index idx_courses_hierarchy_type on public.courses(hierarchy_type);
