# Personal Trading Dashboard - Setup & Deployment

## Overview

A professional personal trading dashboard built with Next.js, Supabase, and Tailwind CSS. Features an IBKR-style table-based portfolio interface with position aggregation, weighted average calculations, and real-time P&L calculations.

## Stack

- **Framework**: Next.js 16.1.6 (App Router, JavaScript only)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4 with dark/light theme
- **UI**: Table-based dense layout (no component libraries)

## Project Structure

```
src/
├── app/
│   ├── layout.js                 # Root layout with ThemeProvider
│   ├── globals.css               # Global styles + CSS variables
│   ├── page.js                   # Redirect to dashboard
│   ├── login/page.js             # Authentication UI
│   └── dashboard/page.js         # Main portfolio dashboard
├── components/
│   ├── ThemeProvider.js          # Dark/light theme context
│   ├── ThemeToggle.js            # Theme toggle button
│   ├── PortfolioTable.js         # Main portfolio table component
│   └── TradeForm.js              # Add trade form component
├── lib/
│   ├── supabase/
│   │   ├── server.js             # Server-side Supabase functions
│   │   └── client.js             # Client-side Supabase functions
│   └── utils/
│       └── positions.js          # Position aggregation & calculations
├── middleware.js                 # Auth middleware
└── SUPABASE_SCHEMA.sql           # Database schema (SQL)
```

## Setup Steps

### 1. Environment Variables

Create `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Get these from Supabase Dashboard → Settings → API keys

### 2. Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `SUPABASE_SCHEMA.sql`
3. Run the SQL to create the `trades` table with RLS policies

The schema includes:
- `trades` table with columns: id, user_id, ticker, side, shares, price, commission, created_at, updated_at
- Row Level Security (RLS) enabled
- Proper indexes for performance
- Auto-calculated commission helper function

### 3. Dependencies

Already installed:
- `@supabase/ssr` - For SSR support
- `@supabase/supabase-js` - Supabase client
- `next` - Latest App Router
- `tailwindcss` - CSS framework

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

### Position Aggregation

Positions are calculated dynamically from trades:

1. **Group trades by ticker**
2. **Calculate weighted average entry price**:
   - `avgPrice = totalBuyCost / totalBuyShares`
   - Includes commission impact
3. **Net quantity** = total buy shares - total sell shares
4. **Cost basis** = net quantity × avgPrice
5. **Break-even price** includes commission impact on sell

Example:
```
Buy 100 AAPL @ $150 → Commission $0.50
Buy 50 AAPL @ $152 → Commission $0.50
Sell 30 AAPL @ $155 → Commission $0.50

Position: 120 shares
Avg Price: $150.83 (weighted average)
Cost Basis: $18,099.60
Break-even: $150.87 (must cover commissions)
```

### Commission Logic (IBKR Pro)

- $0.005 per share
- Minimum $1 per trade
- Applied on both buy and sell

Calculated: `commission = Math.max(shares × 0.005, 1.0)`

### Real-time P&L

When user inputs `Current Price`:
```
Market Value = shares × currentPrice
Gross P&L = marketValue - costBasis
Unrealized P&L = grossPnL - totalCommissions
Return % = (unrealizedPnL / costBasis) × 100
```

## Components

### PortfolioTable

Dense table layout showing:
- Ticker
- Position (shares)
- Avg Price (weighted)
- Cost Basis
- Current Price (editable input)
- Market Value
- Unrealized P&L (color-coded)
- Unrealized P&L %
- Break-even Price
- Total Commissions

Features:
- Click rows to expand trade history
- View all individual trades
- Delete trades from history
- Responsive on mobile

### TradeForm

Add new trades with:
- Ticker (auto-uppercase)
- Side (buy/sell dropdown)
- Shares
- Price
- Commission (auto-calculated)

Validation:
- All fields required
- Positive shares and price
- Auto commission = `max(shares × 0.005, 1.0)`

### Portfolio Dashboard

Main page showing:
1. **Summary bar** (top):
   - Net Liquidation Value
   - Total Cost Basis
   - Total Unrealized P&L
   - Return %
   - Total Commissions Paid

2. **Add Trade button** - Opens TradeForm
3. **Portfolio table** - All positions

## Styling

### Colors (Tailwind)

**Dark Mode** (default):
- Background: `#0b0f14` (slate-950)
- Surface: `#111827` (gray-900)
- Borders: `#1f2937` (gray-700)
- Text: `gray-300`
- Profit: `green-500`
- Loss: `red-500`

**Light Mode**:
- Background: `#f3f4f6` (gray-100)
- Surface: `white`
- Borders: `gray-200`
- Text: `gray-800`
- Profit: `green-600`
- Loss: `red-600`

### Design Principles

- **Thin borders** - Subtle grid lines
- **Dense layout** - Monospace numbers, right-aligned
- **Subtle hover** - Light background change
- **No gradients** - Flat colors only
- **No rounded-xl** - Use rounded or rounded-sm
- **No animations** - Instant transitions only
- **Small fonts** - `text-xs` and `text-sm` for data

## Key Utilities

### Position Aggregation (`lib/utils/positions.js`)

```javascript
aggregatePositions(trades) // Returns array of positions
calculatePositionMetrics(position, currentPrice) // Adds price-based metrics
calculatePortfolioSummary(positions) // Portfolio-level stats
```

### Formatting

```javascript
formatCurrency(value) // $1,234.56
formatNumber(value, decimals) // 1,234 or 1,234.50
formatPercent(value, decimals) // 12.34%
getPnLColor(value) // Returns profit/loss color class
```

## Database Operations

### Server-side (src/lib/supabase/server.js)

```javascript
getTradesServer(userId) // Fetch all trades
addTradeServer(userId, trade) // Add new trade
updateTradeServer(tradeId, userId, trade) // Update trade
deleteTradeServer(tradeId, userId) // Delete trade
```

### Client-side (src/lib/supabase/client.js)

```javascript
getTrades(userId) // Fetch trades
addTrade(userId, trade) // Add trade
updateTrade(tradeId, trade) // Update trade
deleteTrade(tradeId) // Delete trade
```

## Authentication Flow

1. User signs up/in on `/login`
2. Supabase creates session
3. Middleware refreshes auth on every request
4. Dashboard checks session, redirects if no auth
5. User can sign out from dashboard header

## Theme Persistence

Theme preference saved to `localStorage`:
- Key: `theme`
- Values: `"dark"` or `"light"`
- Applied on mount via React Context

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Build

```bash
npm run build
npm start
```

## Performance Considerations

- **Positions calculated client-side** from trades array
- **No aggregated position storage** - derived on demand
- **Weighted average calculation** - O(n) but minimal trades
- **Table uses lazy rendering** - Expandable rows for trade history
- **Theme persists** - No flash of unstyled content

## Future Enhancements

1. Export portfolio to CSV
2. Performance charts
3. Position-level notes
4. Multi-account support
5. Real-time price API integration
6. Tax lot tracking (FIFO/LIFO)
7. Trade analytics dashboard

## Troubleshooting

### Hydration errors
- Ensure theme wrapper doesn't render server-side without `suppressHydrationWarning`
- Check that client-side calculations match server rendering

### Commission not calculating
- Verify commission formula: `max(shares × 0.005, 1.0)`
- Check Supabase function is deployed

### Trades not loading
- Verify RLS policies allow user to see their trades
- Check user_id matches in database
- Ensure Supabase credentials are correct

## Support

For issues or questions, refer to:
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
