-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  control_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  reserved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reserved_by_name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  needed_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  approved_by TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_reserved_by ON reservations(reserved_by);
CREATE INDEX idx_reservations_needed_date ON reservations(needed_date);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Policy: allow all authenticated users to read reservations
CREATE POLICY "Allow authenticated read" ON reservations
  FOR SELECT TO authenticated USING (true);

-- Policy: allow authenticated users to insert their own reservations
CREATE POLICY "Allow authenticated insert" ON reservations
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: allow authenticated users to update reservations
CREATE POLICY "Allow authenticated update" ON reservations
  FOR UPDATE TO authenticated USING (true);

-- Policy: allow authenticated users to delete reservations
CREATE POLICY "Allow authenticated delete" ON reservations
  FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE reservations;
