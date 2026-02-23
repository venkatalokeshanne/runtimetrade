-- Migration: Add order_type column to trades table
-- Purpose: Support pending limit orders alongside executed trades
-- Date: 2026-02-23

-- Add the order_type column if it doesn't exist
ALTER TABLE trades ADD COLUMN IF NOT EXISTS order_type VARCHAR(10) DEFAULT 'trade';

-- Add constraint if not already present
ALTER TABLE trades DROP CONSTRAINT IF EXISTS order_type_check;
ALTER TABLE trades ADD CONSTRAINT order_type_check CHECK (order_type IN ('trade', 'order'));

-- Create index for faster filtering of orders vs trades
CREATE INDEX IF NOT EXISTS idx_trades_order_type ON trades(user_id, order_type);
