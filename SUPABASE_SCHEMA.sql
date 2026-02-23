-- Trades table schema for personal trading dashboard
-- Stores individual buy/sell transactions with commission data
-- Also supports pending limit orders (order_type = 'order')

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker VARCHAR(10) NOT NULL,
  side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
  shares NUMERIC(15, 2) NOT NULL CHECK (shares > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  commission NUMERIC(10, 2) NOT NULL CHECK (commission >= 0),
  order_type VARCHAR(10) NOT NULL DEFAULT 'trade' CHECK (order_type IN ('trade', 'order')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT trades_user_id_idx UNIQUE(id, user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_ticker ON trades(user_id, ticker);

-- Enable RLS (Row Level Security)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own trades
CREATE POLICY "Users can view only their trades"
  ON trades
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own trades
CREATE POLICY "Users can insert their own trades"
  ON trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own trades
CREATE POLICY "Users can update their own trades"
  ON trades
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own trades
CREATE POLICY "Users can delete their own trades"
  ON trades
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-calculate commission on insert/update
-- IBKR Pro: $0.005 per share, minimum $1
CREATE OR REPLACE FUNCTION calculate_ibkr_commission(shares_count NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN GREATEST(shares_count * 0.005, 1.00);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
