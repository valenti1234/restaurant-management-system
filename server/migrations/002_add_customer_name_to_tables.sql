-- Add customer_name column to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS customer_name text;

-- Update existing tables to have NULL customer_name
UPDATE tables SET customer_name = NULL WHERE customer_name IS NULL; 