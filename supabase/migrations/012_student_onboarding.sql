-- Add onboarding_completed to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add student profile columns directly to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cnic_file_path text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS education_level text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS degree_title text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS degree_file_path text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profession text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fee_transaction_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fee_submission_date date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fee_receipt_file_path text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_file_path text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS declaration_accepted boolean DEFAULT false;

-- Storage Buckets for Student Documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('student_documents', 'student_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload into their own folder (folder name must be their user ID)
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'student_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'student_documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin generic storage policies
CREATE POLICY "Admins have full access to student_documents"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'student_documents' AND 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
