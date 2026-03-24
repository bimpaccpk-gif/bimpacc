-- Add order_index to courses
alter table public.courses add column order_index integer not null default 0;
