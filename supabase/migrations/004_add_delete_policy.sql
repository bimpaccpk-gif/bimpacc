-- Allow authenticated users to delete profiles
-- Admin authorization handled in application layer
create policy "Authenticated users can delete profiles"
  on public.users for delete
  using (auth.uid() is not null);
