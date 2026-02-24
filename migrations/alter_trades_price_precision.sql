-- Increase trade price precision to 4 decimals
ALTER TABLE trades
  ALTER COLUMN price TYPE NUMERIC(12, 4)
  USING price::NUMERIC(12, 4);
