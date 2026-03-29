# Bulk User Creation Feature Plan

## Overview
Add a bulk account creation option to the admin's "Create User" dialog, allowing admins to create multiple user accounts at once.

## Current State
- `CreateUserDialog` opens a dialog with `CreateUserForm`
- `CreateUserForm` creates a single user at a time
- Uses `adminCreateUser` server action

## Proposed Changes

### 1. UI Changes - Create User Dialog
**File:** `components/admin/create-user-dialog.tsx`

- Add tabs to switch between "Single User" and "Bulk Users" modes
- Tab 1: Single User (existing form)
- Tab 2: Bulk Users (new form)

### 2. New Component - Bulk User Form
**File:** `components/admin/bulk-user-form.tsx`

**Features:**
- File upload for CSV with columns: **email, fullName** (only 2 columns)
- OR textarea for pasting multiple entries (email,fullName per line)
- **Role selection dropdown** (applies to all users in the batch)
- **Course selection dropdown** (applies to all students in the batch)
- Common password field (or auto-generate passwords)
- Preview table showing users to be created
- Progress indicator during creation

**CSV Format (Simplified):**
```csv
email,fullName
student1@gmail.com,AHMED KHAN
student2@gmail.com,FATIMA ALI
```

**Text Format:**
```
student1@gmail.com,AHMED KHAN
student2@gmail.com,FATIMA ALI
```

### 3. Server Action - Bulk Create Users
**File:** `lib/supabase/actions.ts`

**Function:** `adminBulkCreateUsers`

```typescript
export async function adminBulkCreateUsers(
  prevState: { error: string; success: string; results?: any[] } | undefined,
  formData: FormData
): Promise<{ error: string; success: string; results?: any[] }>
```

**Logic:**
- Parse input (CSV or text)
- Get role and courseId from form data (applies to all users)
- Validate each user (email format, required fields)
- Create users in batch with same role and courseId
- Return results with success/failure for each user
- Handle partial failures (some succeed, some fail)

### 4. CSV Template
Provide a downloadable CSV template:
```csv
email,fullName
student1@gmail.com,AHMED KHAN
student2@gmail.com,FATIMA ALI
```

### 5. Validation Rules
- All emails must be @gmail.com
- Full names must be in CAPITAL LETTERS
- Role is selected once for all users
- Course is selected once for all students

### 6. Success/Failure Handling
- Show summary: "Created 8/10 users successfully"
- Display list of failed users with reasons
- Option to retry failed users

## Implementation Steps

1. **Create bulk-user-form.tsx component**
   - File upload or textarea input
   - Role selection dropdown
   - Course selection dropdown
   - Preview table
   - Progress indicator

2. **Create adminBulkCreateUsers server action**
   - Parse input
   - Apply same role and courseId to all users
   - Validate each user
   - Create users in batch
   - Return detailed results

3. **Update create-user-dialog.tsx**
   - Add tabs for single vs bulk mode
   - Import and use BulkUserForm

4. **Add CSV template download**
   - Create sample CSV file
   - Add download button

## Benefits
- Save admin time when onboarding multiple students
- Reduce manual data entry errors
- Consistent user creation process
- Better tracking of bulk operations
- Simpler CSV format (only email and name)

## Considerations
- Rate limiting for bulk operations
- Transaction handling (all or nothing vs partial success)
- Email notification to created users
- Password reset flow for auto-generated passwords
