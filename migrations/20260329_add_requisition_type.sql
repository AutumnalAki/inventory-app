-- Add requisition_type column to track whether it's a borrow or reservation
ALTER TABLE requisitions
ADD COLUMN IF NOT EXISTS requisition_type VARCHAR(50) DEFAULT 'reservation';

-- Create index for efficient filtering by requisition type
CREATE INDEX IF NOT EXISTS idx_requisitions_type ON requisitions(requisition_type);
