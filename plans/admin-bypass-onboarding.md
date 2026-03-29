# Admin Bypass Onboarding Feature

## Overview
Allow admins to bypass the student onboarding process, enabling students to access the dashboard immediately without completing the onboarding form.

**IMPORTANT SECURITY REQUIREMENT**: Only admins can bypass onboarding. Students cannot bypass their own onboarding under any circumstances.

## Current State
- Students must complete a comprehensive onboarding form including:
  - Personal information (father name, DOB, CNIC, avatar)
  - Academic background (education level, degree title, profession, degree document)
  - Contact details (WhatsApp number, postal address)
  - Fee verification (transaction ID, submission date, receipt)
  - Declaration acceptance
- The onboarding modal blocks dashboard access until `onboarding_completed = true`
- Admins can view/edit student profiles and approve students, but cannot bypass onboarding

## Proposed Solution

### 1. Database Changes
Add a new column to track bypassed onboarding:
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_bypassed boolean DEFAULT false;
```

**Additional Security: Row Level Security (RLS) Policy**
```sql
-- Prevent students from updating their own onboarding_bypassed field
CREATE POLICY "Only admins can update onboarding_bypassed"
  ON public.users FOR UPDATE
  USING (
    -- Allow admins to update any user's onboarding_bypassed
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    OR
    -- Allow users to update their own profile EXCEPT onboarding_bypassed
    (auth.uid() = id AND
     -- This policy only applies when onboarding_bypassed is NOT being changed
     -- The actual check happens in the application layer
    )
  );
```

Note: The primary security is enforced at the application layer through the server action, with RLS as an additional safeguard.

### 2. Server Action
Create a new server action `adminBypassOnboarding` in `lib/supabase/actions.ts`:
- **Verify admin role** (critical security check)
- Set `onboarding_bypassed = true` for the specified student
- Optionally set `onboarding_completed = true` to fully skip the process
- Log the action for audit purposes
- **Prevent self-bypass**: Admin cannot bypass their own onboarding
- **Prevent student bypass**: Only users with role='admin' can call this action

### 3. Admin UI Updates

#### Admin Users Page (`app/(dashboard)/admin/users/page.tsx`)
- Add a new "Bypass Onboarding" button/action for students who haven't completed onboarding
- Show bypass status indicator (similar to approval status)
- Disable bypass button if onboarding is already completed or bypassed

#### Student Application Dialog (`components/admin/student-application-dialog.tsx`)
- Add "Bypass Onboarding" button in the status bar section
- Show bypass status in the account information section
- Allow admin to toggle bypass on/off

### 4. Dashboard Layout Update
Update `app/(dashboard)/layout.tsx` to check for bypassed onboarding:
```typescript
const needsOnboarding = isStudent && !user.onboarding_completed && !user.onboarding_bypassed;
```

### 5. Type Updates
Update `types/index.ts` and `lib/dal.ts` to include `onboarding_bypassed` in user profiles.

## Implementation Steps

### Step 1: Database Migration
Create migration file `supabase/migrations/016_add_onboarding_bypassed.sql`:
- Add `onboarding_bypassed` column to users table
- Set default value to `false`

### Step 2: Update Types
Update `types/index.ts`:
- Add `onboarding_bypassed: boolean` to `UserProfile` interface

Update `lib/dal.ts`:
- Add `onboarding_bypassed` to `SessionUser` and `FullUserProfile` interfaces
- Include in `getCurrentUser` and `getFullUserProfile` queries

### Step 3: Server Action
Add `adminBypassOnboarding` function in `lib/supabase/actions.ts`:
- Verify admin role
- Update user record with `onboarding_bypassed = true`
- Return success/error message

### Step 4: Admin UI Components

#### Update `app/(dashboard)/admin/users/page.tsx`:
- Add bypass status column
- Add bypass action button
- Show visual indicator for bypassed students

#### Update `components/admin/student-application-dialog.tsx`:
- Add bypass button in status bar
- Show bypass status in account info section
- Handle bypass action state

### Step 5: Dashboard Layout
Update `app/(dashboard)/layout.tsx`:
- Modify `needsOnboarding` logic to check `onboarding_bypassed`
- Ensure bypassed students can access dashboard immediately

## User Flow

### Admin Bypass Flow:
1. Admin navigates to User Management page
2. Admin finds a student with "Pending Setup" status
3. Admin clicks "Bypass Onboarding" button
4. System sets `onboarding_bypassed = true` for the student
5. Student can now access dashboard without completing onboarding form
6. Admin sees "Bypassed" status indicator for the student

### Student Experience:
1. Student logs in
2. System checks `onboarding_completed` and `onboarding_bypassed`
3. If `onboarding_bypassed = true`, skip onboarding modal
4. Student accesses dashboard immediately
5. Student can still complete onboarding later if needed (optional)

## Benefits
- Faster student onboarding for special cases
- Admin flexibility for bulk imports or pre-approved students
- Maintains audit trail of bypassed onboarding
- Students can still complete onboarding later if desired

## Security Considerations

### Access Control
1. **Server-side verification**: The `adminBypassOnboarding` action must verify the caller has admin role before allowing bypass
2. **No client-side bypass**: Students cannot manipulate the `onboarding_bypassed` flag through client-side code
3. **Database-level security**: Consider adding a Row Level Security (RLS) policy to prevent students from updating their own `onboarding_bypassed` field
4. **Audit logging**: Log all bypass actions with admin ID and timestamp

### Implementation Security
- The server action should check: `if (callerRole !== 'admin') return error`
- The dashboard layout should only check the `onboarding_bypassed` flag (no client-side override)
- Students cannot set `onboarding_bypassed = true` through any form or API endpoint

## Additional Considerations
- Bypassed students may have incomplete profile information
- Admin should be able to un-bypass if needed (toggle functionality)
- Consider adding a note/reason field for bypassing (future enhancement)
- Bypassed students should still be able to complete onboarding later if they want to provide full information
