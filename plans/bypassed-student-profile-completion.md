# Bypassed Student Profile Completion Feature

## Overview
Allow students whose onboarding was bypassed by an admin to complete their profile later, with restrictions on document visibility.

**Key Requirements:**
1. Bypassed students can complete their profile from the profile page
2. Document uploads are NOT compulsory for bypassed students
3. Students can ONLY see text data in their profile (no documents)
4. Only admins can view uploaded documents (CNIC, degree, receipt, avatar)
5. Bypassed students can complete profile at their convenience

---

## Current State Analysis

### Profile Page (`app/(dashboard)/profile/page.tsx`)
- Shows documents (CNIC, degree, receipt, avatar) to students who completed onboarding
- Uses `DocumentField` component to display images/PDFs with download links
- Generates signed URLs for document access
- **Issue**: Documents are visible to students

### Onboarding Modal (`components/student/onboarding-modal.tsx`)
- Requires ALL 4 file uploads (CNIC, degree, receipt, avatar)
- Files are mandatory (`required` attribute on inputs)
- **Issue**: Cannot be used for bypassed students (too restrictive)

### Admin View (`components/admin/student-application-dialog.tsx`)
- Already shows documents to admins
- Uses `DocumentViewer` component
- **Status**: ✅ Correct (admins should see documents)

---

## Implementation Plan

### 1. Create Profile Completion Form for Bypassed Students

**New Component**: `components/student/profile-completion-form.tsx`

**Features:**
- Similar to onboarding modal but WITHOUT mandatory file uploads
- All text fields are optional (students can fill what they want)
- File uploads are optional (students can skip documents)
- Shows current profile data if already partially filled
- Allows updating existing data

**Fields to Include:**
- Personal Information:
  - Father's Name (optional)
  - Date of Birth (optional)
  - CNIC/Passport Document (optional upload)
  - Student Picture (optional upload)

- Academic Background:
  - Education Level (optional)
  - Degree Title (optional)
  - Profession (optional)
  - Degree/Certificate Document (optional upload)

- Contact Details:
  - WhatsApp Number (optional)
  - Postal Address (optional)

- Fee Verification:
  - Transaction ID (optional)
  - Fee Submission Date (optional)
  - Fee Receipt (optional upload)

**NOT Included:**
- Declaration checkbox (not needed for profile completion)
- Account info (read-only, auto-filled)
- Selected course (read-only, shown if applicable)

---

### 2. Update Profile Page

**File**: `app/(dashboard)/profile/page.tsx`

**Changes:**

#### A. Add Profile Completion Button for Bypassed Students
```tsx
{isStudent && user.onboarding_bypassed && !hasOnboarded && (
  <Card className="md:col-span-3">
    <CardHeader>
      <CardTitle>Complete Your Profile</CardTitle>
      <CardDescription>
        Your onboarding was bypassed by an admin. You can complete your profile at any time.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ProfileCompletionForm user={user} />
    </CardContent>
  </Card>
)}
```

#### B. Hide Documents from Student View
**Current**: Shows `DocumentField` for CNIC, degree, receipt, avatar
**New**: Only show text data, hide all document fields

**Remove these sections from student view:**
- Lines 290-293: `DocumentField` for CNIC and avatar
- Lines 311-313: `DocumentField` for degree
- Lines 346-348: `DocumentField` for receipt

**Keep text fields:**
- Father's Name
- Date of Birth
- Education Level
- Degree Title
- Profession
- WhatsApp Number
- Postal Address
- Transaction ID
- Fee Submission Date

#### C. Show Profile Data for Bypassed Students Who Completed Profile
**Current**: Only shows profile data if `hasOnboarded` is true
**New**: Show profile data if:
- `hasOnboarded` is true, OR
- `onboarding_bypassed` is true AND profile has some data filled

**Logic:**
```tsx
const showProfileData = isStudent && (hasOnboarded || (user.onboarding_bypassed && hasProfileData(user)));
```

Where `hasProfileData` checks if any profile field is filled.

---

### 3. Create Server Action for Profile Completion

**File**: `app/actions/student.ts`

**New Action**: `completeBypassedProfile`

**Features:**
- Accepts optional text fields (father_name, dob, education_level, etc.)
- Accepts optional file paths (cnic_file_path, degree_file_path, etc.)
- Updates user profile WITHOUT setting `onboarding_completed = true`
- Only updates fields that are provided (partial updates allowed)
- Does NOT require declaration acceptance

**Security:**
- Verify user is a student
- Verify user's onboarding was bypassed
- Prevent updating if onboarding already completed
- Only allow updating own profile

**Implementation:**
```typescript
export async function completeBypassedProfile(
  _prevState: { error: string; success: string } | undefined,
  formData: FormData
): Promise<{ error: string; success: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  // Verify user is a student with bypassed onboarding
  const { data: user } = await supabase
    .from("users")
    .select("role, onboarding_bypassed, onboarding_completed")
    .eq("id", session.userId)
    .single();

  if (!user || user.role !== "student") {
    return { error: "Only students can complete profile.", success: "" };
  }

  if (!user.onboarding_bypassed) {
    return { error: "Profile completion is only available for bypassed students.", success: "" };
  }

  if (user.onboarding_completed) {
    return { error: "Profile already completed via onboarding.", success: "" };
  }

  // Build update object with only provided fields
  const updates: Record<string, any> = {};
  
  // Text fields (optional)
  const fatherName = formData.get("father_name") as string;
  const dob = formData.get("dob") as string;
  const educationLevel = formData.get("education_level") as string;
  const degreeTitle = formData.get("degree_title") as string;
  const profession = formData.get("profession") as string;
  const whatsappNumber = formData.get("whatsapp_number") as string;
  const postalAddress = formData.get("postal_address") as string;
  const feeTransactionId = formData.get("fee_transaction_id") as string;
  const feeSubmissionDate = formData.get("fee_submission_date") as string;

  if (fatherName) updates.father_name = fatherName;
  if (dob) updates.dob = dob;
  if (educationLevel) updates.education_level = educationLevel;
  if (degreeTitle) updates.degree_title = degreeTitle;
  if (profession) updates.profession = profession;
  if (whatsappNumber) updates.whatsapp_number = whatsappNumber;
  if (postalAddress) updates.postal_address = postalAddress;
  if (feeTransactionId) updates.fee_transaction_id = feeTransactionId;
  if (feeSubmissionDate) updates.fee_submission_date = feeSubmissionDate;

  // File paths (optional)
  const cnicPath = formData.get("cnic_file_path") as string;
  const degreePath = formData.get("degree_file_path") as string;
  const receiptPath = formData.get("fee_receipt_file_path") as string;
  const avatarPath = formData.get("avatar_file_path") as string;

  if (cnicPath) updates.cnic_file_path = cnicPath;
  if (degreePath) updates.degree_file_path = degreePath;
  if (receiptPath) updates.fee_receipt_file_path = receiptPath;
  if (avatarPath) updates.avatar_file_path = avatarPath;

  // Only update if there are changes
  if (Object.keys(updates).length === 0) {
    return { error: "No data provided to update.", success: "" };
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.userId);

  if (error) {
    return { error: error.message, success: "" };
  }

  return { error: "", success: "Profile updated successfully!" };
}
```

---

### 4. Update Profile Page to Show Completion Form

**File**: `app/(dashboard)/profile/page.tsx`

**Add Import:**
```typescript
import { ProfileCompletionForm } from "@/components/student/profile-completion-form";
```

**Add Section (after Account Details Card, before Student Onboarding Details):**
```tsx
{/* Profile Completion for Bypassed Students */}
{isStudent && user.onboarding_bypassed && !hasOnboarded && (
  <Card className="md:col-span-3">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <UserIcon className="h-5 w-5 text-indigo-500" />
        Complete Your Profile
      </CardTitle>
      <CardDescription>
        Your onboarding was bypassed by an admin. You can complete your profile 
        at any time to provide additional information. All fields are optional.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ProfileCompletionForm user={user} />
    </CardContent>
  </Card>
)}
```

**Update Profile Data Display Logic:**
```tsx
{/* Show profile data if:
    1. Student completed onboarding, OR
    2. Student was bypassed AND has some profile data */}
{isStudent && (hasOnboarded || (user.onboarding_bypassed && hasProfileData(user))) && (
  <>
    {/* Personal Information - TEXT ONLY, NO DOCUMENTS */}
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-indigo-500" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField icon={UserIcon} label="Full Name" value={user.full_name} />
          <InfoField icon={UserIcon} label="Father's Name" value={user.father_name} />
          <InfoField icon={Calendar} label="Date of Birth" value={formatDate(user.dob)} />
        </dl>
        {/* NO DocumentField for CNIC or avatar - students cannot see documents */}
      </CardContent>
    </Card>

    {/* Academic Background - TEXT ONLY */}
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-500" />
          Academic Background
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoField icon={GraduationCap} label="Education Level" value={user.education_level} />
          <InfoField icon={GraduationCap} label="Degree Title" value={user.degree_title} />
          <InfoField icon={Briefcase} label="Profession" value={user.profession} />
        </dl>
        {/* NO DocumentField for degree - students cannot see documents */}
      </CardContent>
    </Card>

    {/* Contact Details */}
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-indigo-500" />
          Contact Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoField icon={Phone} label="WhatsApp Number" value={user.whatsapp_number} />
          <InfoField icon={MapPin} label="Postal Address" value={user.postal_address} />
        </dl>
      </CardContent>
    </Card>

    {/* Fee Verification - TEXT ONLY */}
    <Card className="md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-500" />
          Fee Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoField icon={CreditCard} label="Transaction ID" value={user.fee_transaction_id} />
          <InfoField icon={Calendar} label="Payment Date" value={formatDate(user.fee_submission_date)} />
        </dl>
        {/* NO DocumentField for receipt - students cannot see documents */}
      </CardContent>
    </Card>
  </>
)}
```

**Add Helper Function:**
```typescript
function hasProfileData(user: FullUserProfile): boolean {
  return !!(
    user.father_name ||
    user.dob ||
    user.education_level ||
    user.degree_title ||
    user.profession ||
    user.whatsapp_number ||
    user.postal_address ||
    user.fee_transaction_id ||
    user.fee_submission_date ||
    user.cnic_file_path ||
    user.degree_file_path ||
    user.fee_receipt_file_path ||
    user.avatar_file_path
  );
}
```

---

### 5. Remove `getSignedUrl` from Profile Page

**Current**: Profile page generates signed URLs for documents (lines 42-50, 157-170)
**New**: Remove this logic since students cannot see documents

**Remove:**
- `getSignedUrl` function (lines 42-50)
- Signed URL generation (lines 157-170)
- `cnicUrl`, `degreeUrl`, `receiptUrl`, `avatarFileUrl` variables

**Reason**: Documents are only visible to admins, who access them via `student-application-dialog.tsx` which already has its own signed URL generation.

---

### 6. Update Admin View (No Changes Needed)

**File**: `components/admin/student-application-dialog.tsx`

**Status**: ✅ Already shows documents to admins
- Uses `DocumentViewer` component
- Generates signed URLs for document access
- Shows CNIC, degree, receipt, avatar

**No changes required** - admin view is correct as-is.

---

## User Flows

### Flow 1: Bypassed Student Completes Profile Later

1. Admin bypasses student's onboarding
2. Student logs in → sees dashboard (no onboarding modal)
3. Student navigates to Profile page
4. Student sees "Complete Your Profile" section with form
5. Student fills in optional text fields (father name, DOB, etc.)
6. Student optionally uploads documents (CNIC, degree, receipt, avatar)
7. Student clicks "Save Profile"
8. Profile is updated (partial updates allowed)
9. Student sees their text data in profile (NO documents shown)
10. Admin can view all documents in student application dialog

### Flow 2: Bypassed Student Views Profile

1. Student logs in
2. Student navigates to Profile page
3. Student sees:
   - Account details (name, email, role, etc.)
   - "Complete Your Profile" button (if not yet completed)
   - Profile data (if previously filled) - TEXT ONLY, NO DOCUMENTS
4. Student can click "Update Profile" to modify existing data

### Flow 3: Admin Views Bypassed Student's Documents

1. Admin navigates to User Management
2. Admin clicks "Review" on a bypassed student
3. Admin sees student application dialog
4. Admin can view all uploaded documents:
   - CNIC/Passport image
   - Student photo
   - Degree/certificate
   - Fee receipt
5. Admin can download documents

---

## Security Considerations

### Access Control
1. **Profile Completion**: Only students with `onboarding_bypassed = true` can use the completion form
2. **Document Visibility**: Students cannot access documents via profile page
3. **Admin Access**: Only admins can view documents via student application dialog
4. **Server Action**: Verifies user role and bypass status before allowing updates

### Data Privacy
- Students can only see their own text data
- Documents are stored in Supabase Storage with RLS policies
- Signed URLs are generated only for admin access
- Students cannot generate signed URLs for their own documents

---

## File Changes Summary

### New Files
1. `components/student/profile-completion-form.tsx` - Profile completion form component
2. `plans/bypassed-student-profile-completion.md` - This plan document

### Modified Files
1. `app/(dashboard)/profile/page.tsx`
   - Add import for `ProfileCompletionForm`
   - Add "Complete Your Profile" section for bypassed students
   - Remove document display from student view
   - Update profile data display logic
   - Remove `getSignedUrl` function and related code

2. `app/actions/student.ts`
   - Add `completeBypassedProfile` server action

### Unchanged Files
1. `components/admin/student-application-dialog.tsx` - Already shows documents to admins ✅
2. `components/student/onboarding-modal.tsx` - Used for regular onboarding, not modified
3. `lib/dal.ts` - No changes needed
4. `types/index.ts` - No changes needed

---

## Testing Checklist

### Student Profile Completion
- [ ] Bypassed student can see "Complete Your Profile" section
- [ ] Non-bypassed student does NOT see "Complete Your Profile" section
- [ ] Student can fill in optional text fields
- [ ] Student can optionally upload documents
- [ ] Student can save partial profile (some fields empty)
- [ ] Student can update existing profile data
- [ ] Success message shows after saving

### Document Visibility
- [ ] Student cannot see CNIC document in profile
- [ ] Student cannot see degree document in profile
- [ ] Student cannot see fee receipt in profile
- [ ] Student cannot see avatar photo in profile
- [ ] Student can see text data (father name, DOB, etc.)
- [ ] Admin can see all documents in student application dialog

### Security
- [ ] Non-bypassed student cannot access profile completion form
- [ ] Student cannot bypass their own onboarding
- [ ] Server action verifies user role and bypass status
- [ ] Students cannot generate signed URLs for documents

### Edge Cases
- [ ] Bypassed student with no profile data sees empty fields
- [ ] Bypassed student with partial profile data sees filled fields
- [ ] Bypassed student can update profile multiple times
- [ ] Profile completion does NOT set `onboarding_completed = true`

---

## Benefits

1. **Flexibility**: Bypassed students can complete profile at their convenience
2. **Privacy**: Students cannot see sensitive documents (ID, certificates)
3. **Admin Control**: Admins retain full visibility of all documents
4. **Partial Updates**: Students can fill in what they know, update later
5. **No Breaking Changes**: Existing onboarding flow remains unchanged

---

## Future Enhancements (Optional)

1. **Profile Completion Progress**: Show percentage of profile completed
2. **Reminders**: Email reminders for bypassed students to complete profile
3. **Validation**: Optional validation rules for specific fields
4. **Profile Completeness Badge**: Visual indicator of profile completion status
