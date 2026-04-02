-- Add device fingerprint columns to users table for device-locking feature
-- Student accounts are locked to their first login device

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMPTZ;
