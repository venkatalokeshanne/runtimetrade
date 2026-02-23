'use client';

import { useState } from 'react';
import { formatCurrency, formatNumber, formatPercent, getPnLColor } from '@/lib/utils/positions';

export default function PortfolioTable({ positions = [], onDeleteTrade = null, onPriceChange = null, onTickerClick = null, onSell = null, exchangeRate = 1.0, currency = 'USD' }) {
  const [editingPrices, setEditingPrices] = useState({});

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

  const handlePriceCommit = (ticker, price) => {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice) && numPrice > 0 && onPriceChange) {
      onPriceChange(ticker, numPrice);
    }
  };

  const handlePriceBlur = (ticker) => {
    const newPrices = { ...editingPrices };
    delete newPrices[ticker];
    setEditingPrices(newPrices);
  };

  const handleDeleteTrade = async (tradeId, ticker) => {
    if (onDeleteTrade) {
      await onDeleteTrade(tradeId);
    }
  };

  // Calculate hypothetical sell metrics (if all current shares sold at current price)
  const calculateHypotheticalSell = (position) => {
    if (position.shares <= 0 || position.currentPrice <= 0) {
      return { sellPrice: 0, sellPnL: 0, sellPnLPercent: 0 };
    }
    const sellCommission = Math.max(position.shares * 0.005, 1.0);
    const proceedsAfterComm = position.shares * position.currentPrice - sellCommission;
    const sellPrice = (position.costBasis + sellCommission) / position.shares;
    const sellPnL = proceedsAfterComm - position.costBasis;
    const sellPnLPercent = position.costBasis > 0 ? (sellPnL / position.costBasis) * 100 : 0;
    return { sellPrice, sellPnL, sellPnLPercent };
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-gray-500 dark:text-gray-500 light:text-gray-600">
          No positions yet. Add your first trade to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-gray-100 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Ticker</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Current Price</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Break-even</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Avg Price</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Sell P&L ({currency})</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Cost Basis</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Market Value</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">Unrealized P&L ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => {
            const { sellPnL, sellPnLPercent } = calculateHypotheticalSell(position);
            return (
              <tr
                key={position.ticker}
                className="border-b border-gray-800 dark:border-gray-800 light:border-gray-200 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-50 transition-colors"
              >
                <td 
                  className="px-3 py-2 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span 
                      className="font-mono text-gray-100 dark:text-gray-100 light:text-gray-900 font-semibold cursor-pointer hover:text-blue-400 dark:hover:text-blue-400 light:hover:text-blue-500 transition-colors"
                      onClick={() => onSell && onSell(position.ticker, position.shares)}
                    >
                      {displayTicker(position.ticker)}
                    </span>
                    <span className="text-xs font-mono text-gray-400 dark:text-gray-400 light:text-gray-600">
                      {formatNumber(position.shares, 0)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-block min-w-[6rem] text-center font-mono text-sm text-gray-100 dark:text-gray-100 light:text-gray-900">
                    {Number.isFinite(position.currentPrice) && position.currentPrice > 0
                      ? position.currentPrice.toFixed(4)
                      : '--'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                  {formatCurrency(position.breakEvenPrice)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                  {formatCurrency(position.avgPrice)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`font-mono flex flex-col items-center ${getPnLColor(sellPnL)}`}>
                    <span>{formatCurrencyValue(sellPnL)}</span>
                    <span className="text-xs">{formatPercent(sellPnLPercent)}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                  {formatCurrency(position.costBasis)}
                </td>
                <td className="px-3 py-2 text-center font-mono text-gray-300 dark:text-gray-300 light:text-gray-800">
                  {formatCurrency(position.marketValue)}
                </td>
                <td className={`px-3 py-2 text-center font-mono font-semibold ${getPnLColor(position.unrealizedPnL)}`}>
                  <span className="flex flex-col items-center">
                    <span>{formatCurrencyValue(position.unrealizedPnL)}</span>
                    <span className="text-xs">{formatPercent(position.unrealizedPnLPercent)}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
