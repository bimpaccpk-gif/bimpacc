-- Verifies, as a REAL student, whether privilege escalation is possible.
-- SAFE TO RUN ON PRODUCTION: the block always ends with RAISE EXCEPTION, which
-- aborts and rolls back everything it did. Nothing is ever committed.
-- The result is shown as the error message ("TEST RESULT: ...").
--
-- Before the hardening migration expect "VULNERABLE"; after it expect "blocked".

do $$
declare
  sid uuid;
  cid uuid;
  n   int;
  res text := '';
begin
  select id into sid from public.users where role = 'student' limit 1;
  if sid is null then
    raise exception 'TEST RESULT: no student found to test with';
  end if;

  -- Act as that student, exactly like a browser using the public anon key.
  perform set_config('request.jwt.claims',
    json_build_object('sub', sid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', sid::text, true);
  set local role authenticated;

  -- Test 1: can a student make themselves admin?
  begin
    update public.users set role = 'admin' where id = sid;
    get diagnostics n = row_count;
    res := res || case when n = 1 then 'role->admin: VULNERABLE; ' else 'role->admin: blocked (0 rows); ' end;
  exception when others then
    res := res || 'role->admin: blocked (' || sqlerrm || '); ';
  end;

  -- Test 2: can a student change their own approval? (value is FLIPPED so it is a real change,
  -- not a no-op on an already-approved student)
  begin
    update public.users set is_approved = not coalesce(is_approved, false) where id = sid;
    get diagnostics n = row_count;
    res := res || case when n = 1 then 'self-approve: VULNERABLE; ' else 'self-approve: blocked (0 rows); ' end;
  exception when others then
    res := res || 'self-approve: blocked (' || sqlerrm || '); ';
  end;

  -- Test 3: can a student enroll themselves in a course?
  begin
    select c.id into cid from public.courses c
    where not exists (
      select 1 from public.enrollments e where e.user_id = sid and e.course_id = c.id
    ) limit 1;
    if cid is null then
      res := res || 'self-enroll: skipped (no free course); ';
    else
      insert into public.enrollments (user_id, course_id) values (sid, cid);
      res := res || 'self-enroll: VULNERABLE; ';
    end if;
  exception when others then
    res := res || 'self-enroll: blocked (' || sqlerrm || '); ';
  end;

  -- Always abort so nothing above is ever committed.
  raise exception 'TEST RESULT: %', res;
end $$;
