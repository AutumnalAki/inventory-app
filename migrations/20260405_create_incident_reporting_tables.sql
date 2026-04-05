-- Create incident reporting tables
-- This migration supports the Digital Incident Reporting workflow.

CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_number TEXT NOT NULL,
  course_code TEXT NOT NULL,
  designation TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  incident_datetime TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  witness_name TEXT,
  instructor_name TEXT,
  incident_description TEXT NOT NULL,
  injury_details TEXT,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'In Review', 'Resolved')),
  damaged_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_status
  ON incident_reports(status);

CREATE INDEX IF NOT EXISTS idx_incident_reports_incident_datetime
  ON incident_reports(incident_datetime DESC);

CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at
  ON incident_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS broken_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_report_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  inventory_item_id BIGINT NOT NULL,
  item_name TEXT NOT NULL,
  damage_count INTEGER NOT NULL CHECK (damage_count > 0),
  damage_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broken_items_incident_report_id
  ON broken_items(incident_report_id);

CREATE INDEX IF NOT EXISTS idx_broken_items_inventory_item_id
  ON broken_items(inventory_item_id);
