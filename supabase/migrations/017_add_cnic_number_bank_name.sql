-- Add CNIC/Passport Number and Bank Name columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cnic_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name text;
