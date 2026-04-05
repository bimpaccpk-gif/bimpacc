# Plan: Admin User Detail Page

## Overview

Add a comprehensive admin user detail page at `/admin/users/[userId]` that shows everything about a user — profile, enrollment history, progress, audit log, and account controls. Clicking a user's name in the admin users table navigates to this page.

---

## 1. Database Migration — `022_user_detail_enhancements.sql`

### 1a. Add `enrolled_by` to `enrollments`

```sql
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
```

- Tracks which admin enrolled the student
- Historical records will have NULL (displayed as "System")
- Update `adminCreateUser`, `adminBulkCreateUsers`, `toggleStudentApproval`, and `enrollStudentInCourse` actions to set this field

### 1b. Create `audit_log` table

```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- e.g. 'user.paused', 'user.role_changed', 'enrollment.created'
  details JSONB DEFAULT '{}',  -- e.g. {"old_role": "student", "new_role": "instructor"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1c. Enable RLS + policies for `audit_log`

- Admins can read all audit logs
- Only server-side inserts (via service role)

---

## 2. New Server Actions — `app/actions/admin.ts`

### 2a. `getUserDetail(userId)` — fetches everything for the detail page

Returns a single object with:

- `user` — full user record from `users` table + signed document URLs
- `enrollments` — all enrollments with course title/batch/status + enrolled_by admin name + lesson progress stats (completed/total lessons per enrollment)
- `auditLog` — recent 50 entries from `audit_log` for this user, joined with admin name
- `stats` — computed: total enrollments, completed courses, overall progress %, account age

### 2b. `toggleUserPause(userId, pause)` — pause/unpause a user account (with audit logging)

### 2c. `logAuditEvent(adminId, targetUserId, action, details)` — helper to insert into audit_log (called by other actions)

---

## 3. Update Existing Actions to Log Audit Events

Add `logAuditEvent()` calls to:

- `adminChangeUserRole` — log `user.role_changed` with old/new role
- `toggleStudentApproval` — log `user.approved` / `user.unapproved`
- `adminBypassOnboarding` — log `user.onboarding_bypassed` / `user.onboarding_restored`
- `adminDeleteUser` — log `user.deleted`
- `enrollStudentInCourse` — log `enrollment.created` with course name
- `adminCreateUser` / `adminBulkCreateUsers` — log `user.created`
- New `toggleUserPause` — log `user.paused` / `user.unpaused`

Also update `enrollStudentInCourse` and enrollment actions to set `enrolled_by`.

---

## 4. New Route — `app/(dashboard)/admin/users/[userId]/page.tsx`

### File structure:

```
app/(dashboard)/admin/users/[userId]/
  ├── page.tsx       — Server component, fetches data, renders detail view
  ├── loading.tsx    — Skeleton loader
  └── error.tsx      — Error boundary
```

### Page Layout (Sections):

#### Section 1: Header

- Back button → `/admin/users`
- User avatar (large), full name, email, role badge
- Status badges: Approved / Pending / Onboarding Bypassed / Paused
- Quick actions: Pause/Unpause toggle, Change Role dropdown

#### Section 2: Account Information (Card)

- Full Name, Email, Role, User ID, Created At, Updated At
- Onboarding Status, Approval Status, Account Status (active/paused)

#### Section 3: Personal Information (Card — students only)

- Father's Name, CNIC Number, Date of Birth
- Education Level, Degree Title, Profession
- WhatsApp Number, Postal Address
- Bank Name, Fee Transaction ID, Fee Submission Date

#### Section 4: Enrolled Courses (Card)

- Table/list of enrollments:
  - Course Title (Batch)
  - Enrolled Date
  - Enrolled By (admin name or "System")
  - Progress: "12/25 lessons completed (48%)" with a progress bar
- Total enrolled courses count

#### Section 5: Course Progress Detail (Card)

- Per-enrollment breakdown:
  - Course name
  - List of subjects with lesson completion counts
  - Overall percentage with visual progress bar

#### Section 6: Activity Log (Card)

- Timeline of admin actions on this user:
  - Timestamp, Admin name, Action description
  - e.g. "Mar 15 — Admin X enrolled user in 'Web Development Batch 3'"
  - e.g. "Mar 10 — Admin Y approved user"
  - e.g. "Mar 8 — Account created by Admin Z"
- Shows last 50 entries

---

## 5. Make Users Clickable in Table

Update `components/admin/users-table.tsx`:

- Wrap user name in a `<Link href={/admin/users/${user.id}}>`
- Make avatar also clickable
- Keep existing action buttons (Enroll, Delete, etc.) as-is

---

## 6. Files to Create/Modify

### New files:

- `supabase/migrations/022_user_detail_enhancements.sql`
- `app/(dashboard)/admin/users/[userId]/page.tsx`
- `app/(dashboard)/admin/users/[userId]/loading.tsx`
- `app/(dashboard)/admin/users/[userId]/error.tsx`

### Modified files:

- `app/actions/admin.ts` — add `getUserDetail`, `toggleUserPause`, `logAuditEvent`
- `lib/supabase/actions.ts` — add `enrolled_by` to enrollment inserts, add audit logging
- `app/actions/course.ts` — add `enrolled_by` to enrollment insert, add audit logging
- `components/admin/users-table.tsx` — make user names clickable with Link
- `types/index.ts` — add `is_paused` to `UserProfile`, add new types for audit log and user detail

---

## Implementation Order

1. Migration (022) — `enrolled_by` + `audit_log` table
2. Types — add new interfaces
3. Server actions — `logAuditEvent`, `getUserDetail`, `toggleUserPause`
4. Update existing actions — add audit logging + `enrolled_by`
5. Detail page — `[userId]/page.tsx` with all sections
6. Loading/error pages
7. Make users clickable in table
8. Test & commit
