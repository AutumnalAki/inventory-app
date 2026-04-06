-- Add per-condition quantity tracking on inventory entries.

ALTER TABLE IF EXISTS inventory
ADD COLUMN IF NOT EXISTS broken_quantity INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS for_repairs_quantity INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'inventory_broken_quantity_nonnegative'
	) THEN
		ALTER TABLE inventory
		ADD CONSTRAINT inventory_broken_quantity_nonnegative CHECK (broken_quantity >= 0);
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'inventory_for_repairs_quantity_nonnegative'
	) THEN
		ALTER TABLE inventory
		ADD CONSTRAINT inventory_for_repairs_quantity_nonnegative CHECK (for_repairs_quantity >= 0);
	END IF;
END $$;
