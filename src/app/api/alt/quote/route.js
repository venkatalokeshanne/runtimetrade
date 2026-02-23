export const runtime = 'nodejs';

import YahooFinance from 'yahoo-finance2';

// Initialize yahoo-finance2 instance
const yahooFinance = new YahooFinance();

/**
 * Scrape stock data from alternative sources
 * Uses yahoo-finance2 library for reliable data
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = symbolsParam
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.all(
    symbols.map((symbol) => fetchAlternativeSource(symbol))
  );

  return new Response(JSON.stringify({ data: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Try multiple Yahoo Finance sources to get stock price
 */
async function fetchAlternativeSource(symbol) {
  // Try yahoo-finance2 library first (handles cookies properly)
  let result = await fetchYahooFinance2(symbol);
  if (result.price > 0) return result;

  // Final fallback
  return {
    symbol,
    price: 0,
    source: 'yahoo_all_failed',
    error: 'Could not fetch price',
  };
}

/**
 * Fetch from Yahoo Finance using yahoo-finance2 library
 */
async function fetchYahooFinance2(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol, {
      fields: ['regularMarketPrice', 'preMarketPrice', 'postMarketPrice', 'marketState'],
    });

    if (!quote) {
      console.warn(`[Yahoo Finance2] ${symbol}: No quote returned`);
      return { symbol, price: 0, source: 'yahoo_finance2_no_quote' };
    }

    const marketState = String(quote.marketState || '').toUpperCase();
    let price = 0;
    let priceType = 'regular';

    if (marketState === 'PRE') {
      price = quote.preMarketPrice || quote.regularMarketPrice || 0;
      priceType = quote.preMarketPrice ? 'pre-market' : 'regular';
    } else if (marketState === 'POST' || marketState === 'POSTPOST') {
      price = quote.postMarketPrice || quote.regularMarketPrice || 0;
      priceType = quote.postMarketPrice ? 'post-market' : 'regular';
    } else {
      price = quote.regularMarketPrice || quote.preMarketPrice || quote.postMarketPrice || 0;
      priceType = 'regular';
    }

    if (price > 0) {
      console.log(`[Yahoo Finance2] ${symbol}: price=${price} (${priceType}) ✓`);
      return {
        symbol,
        price,
        source: `yahoo_finance2_${priceType}`,
        marketState: marketState || 'UNKNOWN',
        timestamp: Date.now(),
      };
    }

    console.warn(`[Yahoo Finance2] ${symbol}: No price found in quote`);
    return { symbol, price: 0, source: 'yahoo_finance2_no_price' };
  } catch (error) {
    console.error(`[Yahoo Finance2] Error fetching ${symbol}:`, error.message);
    return {
      symbol,
      price: 0,
      source: 'yahoo_finance2_error',
      error: error.message,
    };
  }
}
