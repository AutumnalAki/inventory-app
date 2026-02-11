-- Add low_stock_threshold column to inventory table
ALTER TABLE inventory ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
-- Optional: index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock_threshold ON inventory(low_stock_threshold);