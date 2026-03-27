-- Add onboarding_completed to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  father_name text not null,
  cnic_file_path text not null,
  dob date not null,
  education_level text not null,
  degree_title text not null,
  degree_file_path text not null,
  profession text not null,
  whatsapp_number text not null,
  postal_address text not null,
  fee_transaction_id text not null,
  fee_submission_date date not null,
  fee_receipt_file_path text not null,
  avatar_file_path text not null,
  declaration_accepted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON public.student_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
create trigger set_student_profiles_updated_at
  before update on public.student_profiles
  for each row
  execute function public.handle_updated_at();

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
