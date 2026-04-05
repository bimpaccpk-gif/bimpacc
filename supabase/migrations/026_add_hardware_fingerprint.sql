-- Add hardware_fingerprint column for device-level identification
-- hardware_fingerprint is based on hardware signals only (same across browsers on same device)
-- device_fingerprint is the full browser fingerprint (for logging/audit purposes)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS hardware_fingerprint TEXT;
