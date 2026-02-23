'use client';

import { useState } from 'react';
import { formatCurrency, formatNumber, getPnLColor } from '@/lib/utils/positions';

export default function TradeHistoryTable({ positions = [], exchangeRate = 1.0, currency = 'USD', onDeleteTrade = null }) {
  const [priceSortOrder, setPriceSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Collect all executed trades from positions
  const allTrades = [];
  positions.forEach((position) => {
    if (position.tradeHistory && Array.isArray(position.tradeHistory)) {
      position.tradeHistory.forEach((trade) => {
        allTrades.push({
          ...trade,
          ticker: position.ticker,
        });
      });
    }
  });

  // Filter by date range (inclusive) when provided
  const filteredTrades = allTrades.filter((trade) => {
    if (!startDate && !endDate) return true;
    const tradeDate = new Date(trade.created_at);
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (tradeDate < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      if (tradeDate > end) return false;
    }
    return true;
  });

  // Sort by price
  filteredTrades.sort((a, b) => {
    const aPrice = Number(a.price) || 0;
    const bPrice = Number(b.price) || 0;
    return priceSortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
  });

  if (allTrades.length === 0) {
    return null;
  }

  const displayTicker = (ticker) => {
    if (!ticker) return '';
    const parts = String(ticker).split(':');
    return parts[parts.length - 1];
  };

  const formatCurrencyValue = (usdValue) => {
    if (currency === 'EUR') {
      const eurValue = usdValue * exchangeRate;
      return `€${eurValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrency(usdValue);
  };

  return (
    <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-50 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded mt-8">
      <div className="px-6 py-4 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
            Trade History
          </h3>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 light:text-gray-600">
              <span>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 light:text-gray-600">
              <span>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2 py-1 text-xs font-mono bg-slate-700 text-gray-200 hover:bg-slate-600 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-gray-100 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Ticker
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Side
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Shares
              </th>
              <th
                className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none"
                onClick={() => setPriceSortOrder(priceSortOrder === 'asc' ? 'desc' : 'asc')}
                title="Sort by price"
              >
                Price {priceSortOrder === 'asc' ? '↑' : '↓'}
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Commission ({currency})
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Total ({currency})
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.map((trade, idx) => {
              const total =
                trade.side === 'buy'
                  ? trade.shares * trade.price + trade.commission
                  : trade.shares * trade.price - trade.commission;

              return (
                <tr
                  key={`${trade.ticker}-${idx}`}
                  className="border-b border-gray-800 dark:border-gray-800 light:border-gray-200 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2 text-center font-mono font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
                    {displayTicker(trade.ticker)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`font-semibold text-sm font-mono ${
                        trade.side === 'buy'
                          ? 'text-green-500 dark:text-green-500 light:text-green-600'
                          : 'text-red-500 dark:text-red-500 light:text-red-600'
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                    {formatNumber(trade.shares, 2)}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                    {formatCurrency(trade.price)}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-gray-400 dark:text-gray-400 light:text-gray-600">
                    {formatCurrencyValue(trade.commission)}
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
                    {formatCurrencyValue(total)}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 whitespace-nowrap">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => onDeleteTrade && onDeleteTrade(trade.id)}
                      className="px-2 py-1 text-xs bg-red-600/60 hover:bg-red-600 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
