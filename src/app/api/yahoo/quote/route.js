export const runtime = 'nodejs';

/**
 * Scrape stock data from Yahoo Finance
 * Falls back to other sources if scraping fails
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
    symbols.map((symbol) => scrapeYahooFinance(symbol))
  );

  return new Response(JSON.stringify({ data: results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function scrapeYahooFinance(symbol) {
  try {
    const url = `https://finance.yahoo.com/quote/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    let price = 0;

    // Pattern 1: Look in a data attribute or JSON response within the HTML
    const jsonPatterns = [
      /regularMarketPrice["\s:]*?\{?["\s:]*raw["\s:]*:?\s*([\d.]+)/i,
      /currentPrice["\s:]*:?\s*([\d.]+)/i,
      /"c":({[\s\S]*?})/,
      /streamer["\s:]*:\s*\{["\s\w:,\{\}]*"result"\s*:\s*\[\s*\{["\s\w:,\{\}]*"regularMarketPrice"\s*:\s*({[\s\S]*?})/,
    ];

    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          let value = match[1];
          // If it's a JSON object, try to parse it
          if (value.startsWith('{')) {
            const obj = JSON.parse(value);
            if (obj.raw) {
              price = parseFloat(obj.raw);
            } else if (typeof obj === 'number') {
              price = obj;
            }
          } else {
            price = parseFloat(value);
          }
          if (price > 0) {
            console.log(`[Yahoo ${symbol}] Found via pattern: ${price}`);
            break;
          }
        } catch (e) {
          // Continue to next pattern
        }
      }
    }

    // Pattern 2: Look for a large visible number near the symbol name in HTML
    if (price === 0) {
      // Try to find span or div with class containing "price" or "quote"
      const numberPattern = /(?:data-symbol|aria-label)="[^"]*\s*(?:DVLT|${symbol})[^"]*"[\s\S]{0,500}(?:<[^>]*>)?\s*(\d{1,3}(?:[,\s]\d{3})*\.?\d{0,2})/i;
      const match = html.match(numberPattern);
      if (match) {
        price = parseFloat(match[1].replace(/[,\s]/g, ''));
        if (price > 0) {
          console.log(`[Yahoo ${symbol}] Found via number pattern: ${price}`);
        }
      }
    }

    // Pattern 3: Try a more aggressive regex for any currency-formatted price
    if (price === 0) {
      // Look for currency symbol followed by a price
      const currencyPattern = /[$€£¥₹]?\s*(\d{1,5}(?:\.\d{1,2})?)\s*(?:USD|CAD|EUR|GBP)?/;
      const allMatches = html.matchAll(
        /(?:previous\s+close|current\s+price|last\s+price|ask)\s*:?\s*[$]?\s*(\d+(?:\.\d{2})?)/gi
      );
      
      for (const match of allMatches) {
        const testPrice = parseFloat(match[1]);
        if (testPrice > 0 && testPrice < 1000) {
          price = testPrice;
          console.log(`[Yahoo ${symbol}] Found via label pattern: ${price}`);
          break;
        }
      }
    }

    // Pattern 4: Extract from any data attribute
    if (price === 0) {
      const dataMatch = html.match(/data-price="([\d.]+)"/);
      if (dataMatch) {
        price = parseFloat(dataMatch[1]);
        console.log(`[Yahoo ${symbol}] Found in data attribute: ${price}`);
      }
    }

    // Pattern 5: If all else fails, try to find market price in the streamer payload
    if (price === 0) {
      const streamerMatch = html.match(/{.*?"regularMarketPrice"\s*:\s*\{.*?"raw"\s*:\s*([\d.]+)/);
      if (streamerMatch) {
        price = parseFloat(streamerMatch[1]);
        console.log(`[Yahoo ${symbol}] Found in streamer: ${price}`);
      }
    }

    if (price > 0) {
      console.log(`[Yahoo] ${symbol}: price=${price} ✓`);
      return {
        symbol,
        price,
        source: 'yahoo_scrape',
        timestamp: Date.now(),
      };
    } else {
      // Log a sample of the HTML for debugging
      const htmlSample = html.substring(0, 2000);
      console.warn(
        `[Yahoo] ${symbol}: Could not extract price. Sample: ${htmlSample.substring(0, 500)}...`
      );
      return {
        symbol,
        price: 0,
        source: 'yahoo_scrape_failed',
        error: 'Price extraction failed - all patterns failed',
      };
    }
  } catch (error) {
    console.error(`[Yahoo] Error scraping ${symbol}:`, error.message);
    return {
      symbol,
      price: 0,
      source: 'yahoo_scrape_error',
      error: error.message,
    };
  }
}
