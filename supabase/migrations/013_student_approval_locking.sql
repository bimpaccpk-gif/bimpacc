-- Add is_approved boolean to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- ==========================================
-- LOCKING STUDENT DOCUMENTS IN STORAGE
-- ==========================================

-- Drop the UPDATE and DELETE policies on storage.objects for the student_documents bucket
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- They can still INSERT and SELECT via the policies established in 012_student_onboarding.sql.
-- Since they generate unique filenames like `cnic_1234567.pdf`, it will always be an INSERT. It is safe to remove UPDATE.
