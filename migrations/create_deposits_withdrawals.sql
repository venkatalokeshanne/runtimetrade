-- Create deposits_withdrawals table
CREATE TABLE IF NOT EXISTS public.deposits_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deposits_withdrawals_user_id ON public.deposits_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_withdrawals_created_at ON public.deposits_withdrawals(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.deposits_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own deposits/withdrawals
CREATE POLICY "Users can view their own deposits/withdrawals"
  ON public.deposits_withdrawals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own deposits/withdrawals
CREATE POLICY "Users can insert their own deposits/withdrawals"
  ON public.deposits_withdrawals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own deposits/withdrawals
CREATE POLICY "Users can delete their own deposits/withdrawals"
  ON public.deposits_withdrawals
  FOR DELETE
  USING (auth.uid() = user_id);
