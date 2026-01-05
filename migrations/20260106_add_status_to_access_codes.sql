-- Add status column to access_codes for timer-based expiration
ALTER TABLE access_codes ADD COLUMN status TEXT DEFAULT 'active';
-- Optional: index for faster queries
CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes(status);