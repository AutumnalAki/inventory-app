-- Add optional response_notes for resolution phase updates.

ALTER TABLE IF EXISTS incident_reports
ADD COLUMN IF NOT EXISTS response_notes TEXT;
