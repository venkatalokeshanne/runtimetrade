# Trading Calculator - Professional Stock Analysis Tool

A professional-grade stock trading calculator built with Next.js, Supabase, and Tailwind CSS. Designed with an institutional trading terminal aesthetic featuring real-time P&L analysis, break-even calculations, and profit simulations.

## Features

- **Real-time Calculations**: All metrics update instantly as you modify inputs
- **IBKR Pro Commission**: $0.005/share ($1 minimum) automatically applied to buy and sell
- **Comprehensive Analysis**:
  - Cost basis calculation with commissions
  - Gross and net P&L
  - Break-even price analysis
  - Profit per $0.01 move
  - Profit per 1% price move
- **Custom Scenarios**: Test dollar and percentage moves instantly
- **Professional UI**: Institutional trading terminal styling with dark theme
- **User Authentication**: Secure signup/signin with Supabase
- **Responsive Design**: Works on desktop and tablet

## Tech Stack

- **Frontend**: Next.js 16+ (App Router) with JavaScript
- **Styling**: Tailwind CSS 4
- **Backend/Auth**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel (recommended)

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- A Supabase account (free at https://supabase.com)

### 2. Installation

Clone or download this project, then install dependencies:

```bash
npm install
```

### 3. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (note your password, you'll need it for database access)
3. Wait for the project to initialize

#### Set Environment Variables

1. In Supabase dashboard, go to **Settings → API**
2. Copy your `Project URL` and `anon public key`
3. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### Create Database Schema

Go to Supabase Dashboard → **SQL Editor**, create a new query and run:

```sql
-- Create calculations table
CREATE TABLE calculations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shares DECIMAL(15, 2) NOT NULL,
  avg_price DECIMAL(15, 4) NOT NULL,
  target_price DECIMAL(15, 4) NOT NULL,
  net_pnl DECIMAL(15, 2) NOT NULL,
  pnl_percent DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX calculations_user_id_idx ON calculations(user_id);
CREATE INDEX calculations_created_at_idx ON calculations(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

-- Create policy - users can only see their own calculations
CREATE POLICY "Users can view own calculations" 
  ON calculations 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy - users can insert their own calculations
CREATE POLICY "Users can insert own calculations" 
  ON calculations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy - users can update their own calculations
CREATE POLICY "Users can update own calculations" 
  ON calculations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy - users can delete their own calculations
CREATE POLICY "Users can delete own calculations" 
  ON calculations 
  FOR DELETE 
  USING (auth.uid() = user_id);
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Test Credentials

For testing before production:
1. Sign up with any email/password on the login page
2. Confirm your email (check spam folder if using real email)
3. Sign in and start using the calculator

## Project Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.js              # Login/signup page
│   ├── dashboard/
│   │   └── page.js              # Main dashboard (protected)
│   ├── page.js                  # Home redirect
│   ├── layout.js                # Root layout
│   └── globals.css              # Global styles & theme
├── components/
│   ├── Calculator.js            # Main calculator component
│   └── StatCard.js              # Stat metric card component
└── lib/
    ├── supabase.js              # Supabase client & auth helpers
    └── utils/
        └── calculations.js      # All math logic and formatting
```

## Trading Calculator Logic

### Commission Structure (IBKR Pro)
- **Per Share**: $0.005/share
- **Minimum**: $1.00 per trade
- Applied to both buy and sell

### Key Calculations

#### Cost Basis (Including Buy Commission)
```
Total Cost Basis = (Shares × Avg Price) + Buy Commission
Cost Basis Per Share = Total Cost Basis / Shares
```

#### Profit/Loss at Target Price
```
Market Value = Shares × Target Price
Gross P&L = Market Value - Total Cost Basis
Net P&L = Gross P&L - Sell Commission
```

#### Break-Even Price
```
Break-Even Price = (Total Cost Basis + Sell Commission) / Shares
```

#### Profit Sensitivities
```
Profit Per $0.01 Move = Shares × $0.01 - Sell Commission
Profit Per 1% Move = (Shares × Avg Price × 0.01) - Sell Commission
```

## Component Guide

### StatCard Component

Displays individual metrics in a clean card format:

```jsx
<StatCard
  label="Net P&L"
  value={formatCurrency(pnl)}
  secondary={formatPercent(pnlPercent)}
  highlight={true}
  color="gain"  // 'gain', 'loss', or 'neutral'
  monospace={true}
/>
```

### Calculator Component

Main interface with real-time updates. All calculations update automatically when inputs change. No refresh needed.

### Calculation Functions

All math logic is in `lib/utils/calculations.js`:

- `calculateCommission(shares)` - Get commission for given shares
- `calculateCostBasis(shares, avgPrice)` - Get cost basis with commissions
- `calculateProfitAnalysis(shares, avgPrice, targetPrice)` - Full P&L analysis
- `calculateDollarMove(shares, avgPrice, dollarMove)` - P&L at price shift
- `calculatePercentageMove(shares, avgPrice, percentMove)` - P&L at % shift
- `formatCurrency(value)` - Format as USD
- `formatNumber(value)` - Format as number
- `formatPercent(value)` - Format as percentage
- `getPnLColor(value)` - Get color class (gain/loss/neutral)

## Styling Philosophy

### Dark Theme Colors
- Background: `#0b0f14` (deep slate)
- Panels: `#111827` (slightly lighter)
- Borders: `#374151` (subtle gray)
- Text: `#e5e7eb` (light gray)
- Profit: `#16a34a` (muted green)
- Loss: `#dc2626` (muted red)

### Design Principles
- **Minimal**: No gradients, no unnecessary effects
- **Serious**: Institutional trading look
- **Clean**: Proper spacing, thin borders, small rounded corners
- **Readable**: Monospace for numbers, clean typography
- **Responsive**: Works on desktop and tablet

## Deployment

### Deploy to Vercel (Recommended)

1. Push project to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

### Deploy to Other Platforms

The app works on any Node.js hosting:
- Netlify
- Fly.io
- Railway
- AWS

Make sure to:
1. Set the same environment variables
2. Use Node.js 18+
3. Run `npm run build` before deploying

## Performance Metrics

- **Page Load**: < 1s (optimized Next.js build)
- **Calculations**: Real-time (<50ms) using client-side math
- **No external API calls** for calculations (all client-side)
- **Database accessed only** for saving/loading calculations

## Security

- ✅ Environment variables protected with `.env.local`
- ✅ Supabase Row Level Security (RLS) enforces user data isolation
- ✅ Authentication required for dashboard
- ✅ HTTPS by default on Vercel
- ✅ No sensitive data exposed in frontend

## Future Enhancements

- Save calculation history to database
- Export P&L analysis as PDF
- Multiple position tracking
- Price alerts
- Historical price data integration
- Commission preset options
- Dark/Light theme toggle
- Mobile app (React Native)

## Troubleshooting

### "Auth check failed" on Dashboard
- Check if `.env.local` has correct Supabase keys
- Verify Supabase project is active
- Try signing out and signing in again

### Calculations not updating
- Ensure all inputs are positive numbers
- Try refreshing the page (F5)
- Check browser console for errors

### Commission not applying
- Default commission is $0.005/share with $1 minimum
- Edit `COMMISSION_PER_SHARE` in `Calculator.js` to change

### Database errors
- Verify SQL schema was created successfully
- Check that RLS policies are enabled
- Run `ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;`

## Support

For issues:
1. Check the Troubleshooting section above
2. Review Supabase documentation: https://supabase.com/docs
3. Check Next.js docs: https://nextjs.org/docs

## License

This project is provided as-is. Modify and use freely for personal or commercial projects.

## Calculation Examples

### Example 1: Buying 1000 shares at $150.50
```
Shares: 1000
Avg Price: $150.50
Target Price: $155.00

Buy Commission: $5 (1000 × $0.005 = $5, meets $1 minimum)
Cost Basis: $150,505 (150,000 + 505)
Cost per Share: $150.505

Market Value at $155: $155,000
Gross P&L: $155,000 - $150,505 = $4,495
Sell Commission: $5 (same calculation)
Net P&L: $4,495 - $5 = $4,490 (2.98% return)

Break-Even: ($150,505 + $5) / 1000 = $150.51
```

### Example 2: Seeing impact of $0.01 move
```
Same position, price moves $0.01

New Price: $150.51
Market Value: $150,510
Gross P&L: $150,510 - $150,505 = $5
Net P&L: $5 - $5 (sell commission) = $0

Breakpoint! At $150.51 you only break even after commissions.
```

## Contact & Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Interactive Brokers IBKR Pro**: https://www.interactivebrokers.com

---

Built with precision. Designed for professionals. No bloat, no fluff.
#   r u n t i m e t r a d e  
 