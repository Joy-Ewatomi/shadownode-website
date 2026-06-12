-- Update requests table to support new pricing system
-- This removes the budget column and adds pricing columns

BEGIN;

-- Drop the old budget column if it exists
ALTER TABLE requests
DROP COLUMN IF EXISTS budget;

-- Add new pricing columns
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS estimated_price INTEGER,
ADD COLUMN IF NOT EXISTS final_price INTEGER,
ADD COLUMN IF NOT EXISTS price_notes TEXT;

-- Update existing requests with estimated prices (set to 0 if unknown)
UPDATE requests 
SET estimated_price = 0 
WHERE estimated_price IS NULL;

-- Create index on estimated_price for filtering
CREATE INDEX IF NOT EXISTS idx_requests_estimated_price ON requests(estimated_price);

COMMIT;
