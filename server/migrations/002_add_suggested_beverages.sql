-- Add suggested_beverages column to menu_items table
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS suggested_beverages TEXT[];

-- Set default empty array for existing rows
UPDATE menu_items
SET suggested_beverages = '{}'
WHERE suggested_beverages IS NULL; 