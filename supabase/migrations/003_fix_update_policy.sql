-- Drop old restrictive update policy
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Admins can update any profile" on public.users;

-- Allow any authenticated user to update profiles
-- Admin authorization handled in application layer
create policy "Authenticated users can update profiles"
  on public.users for update
  using (auth.uid() is not null);
