-- Enhanced device fingerprinting schema
-- Adds component storage for fuzzy matching and forensic analysis

-- Store raw device components as JSON for fuzzy matching
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS device_components JSONB;

-- Add hardware fingerprint + device components to login_history for forensics
ALTER TABLE public.login_history
  ADD COLUMN IF NOT EXISTS hardware_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS device_components JSONB;

-- Bulk-reset all existing device bindings since the fingerprint algorithm changed
-- Students will re-bind on next login with the improved fingerprint
UPDATE public.users
SET
  device_fingerprint = NULL,
  hardware_fingerprint = NULL,
  device_locked_at = NULL,
  device_components = NULL
WHERE role = 'student'
  AND device_fingerprint IS NOT NULL;
