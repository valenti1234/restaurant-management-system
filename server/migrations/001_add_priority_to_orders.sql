-- Add priority column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

-- Update existing orders to have a default priority
UPDATE orders SET priority = 'medium' WHERE priority IS NULL; 