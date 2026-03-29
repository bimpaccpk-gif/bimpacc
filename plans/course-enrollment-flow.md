# Course Enrollment Flow Implementation Plan

## Current Flow Analysis

### Current Registration Flow:
1. User selects a course from dropdown during registration
2. User is **auto-enrolled** in that course immediately upon registration (lines 113-119 in auth.ts)
3. User completes onboarding (personal info, education, contact, payment, declaration)
4. Admin reviews the application
5. Admin approves the user
6. User can access dashboard

### Issues with Current Flow:
- User is enrolled BEFORE admin approval
- Admin cannot see which course the user wants to enroll in
- Onboarding modal doesn't show the selected course
- No way to change enrollment based on admin decision

## Proposed New Flow

### New Registration Flow:
1. User selects a course from dropdown during registration
2. Course selection is **stored** in user profile (NOT auto-enrolled)
3. User completes onboarding - selected course is shown (read-only)
4. Admin reviews application - can see which course user wants
5. Admin approves the user
6. User is **enrolled** in the selected course upon approval
7. User can access dashboard

## Implementation Steps

### Step 1: Database Migration
Add `selected_course_id` column to users table:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS selected_course_id uuid REFERENCES public.courses(id);
```

### Step 2: Update Registration Action
Modify `app/actions/auth.ts`:
- Store `courseId` in user profile instead of auto-enrolling
- Remove the enrollment insert logic

### Step 3: Update Onboarding Modal
Modify `components/student/onboarding-modal.tsx`:
- Fetch and display the selected course name
- Show it as read-only (not changeable)
- Add a new section "Selected Course" before the form

### Step 4: Update Admin Application Dialog
Modify `components/admin/student-application-dialog.tsx`:
- Fetch course name for the selected_course_id
- Display it in a new "Enrollment Request" section
- Show course title and batch

### Step 5: Update Approval Process
Modify `lib/supabase/actions.ts` (toggleStudentApproval):
- When admin approves, enroll user in the selected course
- Insert into enrollments table

### Step 6: Update Admin Actions
Modify `app/actions/admin.ts`:
- Add course information to StudentApplication interface
- Fetch course details when getting student application

## Files to Modify

1. `supabase/migrations/015_add_selected_course_id.sql` (new)
2. `app/actions/auth.ts`
3. `components/student/onboarding-modal.tsx`
4. `components/admin/student-application-dialog.tsx`
5. `lib/supabase/actions.ts`
6. `app/actions/admin.ts`

## Benefits

1. **Admin Control**: Admin can see which course user wants before approving
2. **Transparency**: User sees their selected course during onboarding
3. **Flexibility**: Admin could potentially change enrollment if needed
4. **Audit Trail**: Clear record of what user requested vs what they got
5. **Proper Flow**: Enrollment happens after approval, not before

## Testing Checklist

- [ ] User can select course during registration
- [ ] Course selection is stored in user profile
- [ ] Onboarding modal shows selected course (read-only)
- [ ] Admin can see selected course in application review
- [ ] Admin approval enrolls user in selected course
- [ ] User can access course content after approval
- [ ] User cannot access course before approval
