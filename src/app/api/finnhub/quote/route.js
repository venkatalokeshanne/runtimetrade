export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols') || '';
  const symbols = symbolsParam
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing FINNHUB_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (symbols.length === 0) {
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        // Quote endpoint for current price
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
        const quoteResponse = await fetch(quoteUrl, { cache: 'no-store' });
        const quoteData = await quoteResponse.json();

        // Try to get intraday candle data for more recent prices
        const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=1&from=${Math.floor(Date.now() / 1000) - 3600}&to=${Math.floor(Date.now() / 1000)}&token=${apiKey}`;
        const candleResponse = await fetch(candleUrl, { cache: 'no-store' });
        const candleData = await candleResponse.json();

        let price = 0;
        let source = 'none';
        let timestamp = Date.now();

        // Prefer the most recent candle if available
        if (candleData?.c && Array.isArray(candleData.c) && candleData.c.length > 0) {
          price = candleData.c[candleData.c.length - 1]; // Most recent close
          const candleTimestamp = candleData.t?.[candleData.t.length - 1];
          if (typeof candleTimestamp === 'number') {
            timestamp = candleTimestamp * 1000;
            source = `candle@${new Date(timestamp).toISOString()}`;
          } else {
            source = 'candle@unknown_time';
          }
        } else if (typeof quoteData?.c === 'number' && quoteData.c > 0) {
          price = quoteData.c;
          if (typeof quoteData?.t === 'number') {
            timestamp = quoteData.t * 1000;
            source = `quote@${new Date(timestamp).toISOString()}`;
          } else {
            source = 'quote_no_time';
          }
        } else if (typeof quoteData?.pc === 'number' && quoteData.pc > 0) {
          price = quoteData.pc;
          source = 'quote_prev_close';
        }

        console.log(`[Quote ${symbol}] price=${price}, source=${source}`);

        return {
          symbol,
          price,
          source,
          timestamp,
        };
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error.message);
        return {
          symbol,
          price: 0,
          source: 'error',
          error: error.message,
        };
      }
    })
  );

  return new Response(JSON.stringify({ data: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
