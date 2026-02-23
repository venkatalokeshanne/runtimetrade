'use client';

import { useEffect, useRef } from 'react';

/**
 * Determine polling interval based on time of day
 * All times: 30 seconds (Yahoo Finance rate limit)
 */
function getPollingInterval() {
  return 30000; // 30 seconds for all times
}

export default function MarketStream({ symbols = [], onPrice }) {
  const pollerRef = useRef(null);
  const lastTimestampRef = useRef({});

  useEffect(() => {
    if (!symbols.length) {
      return;
    }

    const query = encodeURIComponent(symbols.join(','));

    const pollQuotes = async () => {
      try {
        // Use combined alternative source endpoint
        const response = await fetch(`/api/alt/quote?symbols=${query}`);
        const data = await response.json();
        
        if (!Array.isArray(data?.data)) {
          return;
        }

        data.data.forEach((item) => {
          if (item?.symbol && typeof item?.price === 'number' && item.price > 0) {
            lastTimestampRef.current[item.symbol] = Date.now();
            
            console.debug(
              `[Quote] ${item.symbol}: price=${item.price}, source=${item.source}`
            );
            
            onPrice(item.symbol, item.price);
          } else if (item?.symbol && item?.price === 0) {
            console.warn(
              `[Quote] ${item.symbol}: No valid price received, source=${item.source}`
            );
          }
        });
      } catch (error) {
        console.error('[Quote] Polling error:', error.message);
      }
    };

    // Initial poll and log current time
    console.log(`[MarketStream] Connecting at ${new Date().toISOString()} to symbols:`, symbols.join(', '));
    pollQuotes();

    // Set up dynamic polling based on market hours
    const setupPolling = () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
      }
      const interval = getPollingInterval();
      console.log(`[MarketStream] Polling every ${interval}ms (current ET time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })})`);
      pollerRef.current = setInterval(pollQuotes, interval);
    };

    setupPolling();

    // Recalculate polling interval every minute
    const intervalCheckRef = setInterval(setupPolling, 60000);

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      if (intervalCheckRef) {
        clearInterval(intervalCheckRef);
      }
    };
  }, [symbols, onPrice]);

  return null;
}
