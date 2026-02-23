'use client';

import { useState, useEffect } from 'react';
import { calculateCommission } from '@/lib/utils/positions';

export default function TradeForm({ 
  onAddTrade, 
  isLoading = false, 
  onClose = null,
  initialTicker = '',
  initialSide = 'buy',
  maxSharesToSell = 0,
  currentPrice = 0
}) {
  const [ticker, setTicker] = useState(initialTicker);
  const [side, setSide] = useState(initialSide);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [orderType, setOrderType] = useState('trade');
  const [currency, setCurrency] = useState('USD');
  const [instrumentType, setInstrumentType] = useState('stock');
  const [baseCurrency, setBaseCurrency] = useState('');
  const [error, setError] = useState('');

  // Initialize with provided values
  useEffect(() => {
    if (initialTicker) {
      setTicker(initialTicker);
    }
    if (initialSide) {
      setSide(initialSide);
    }
  }, [initialTicker, initialSide]);

  const handleClickMax = () => {
    setShares(maxSharesToSell.toString());
    if (currentPrice > 0) {
      setPrice(currentPrice.toString());
      const autoComm = calculateAutoCommission(maxSharesToSell);
      setCommission(autoComm.toFixed(2));
    }
  };

  const calculateAutoCommission = (sharesValue) => {
    return calculateCommission(parseFloat(sharesValue) || 0);
  };

  const handleSharesChange = (value) => {
    if (maxSharesToSell > 0 && parseFloat(value) > maxSharesToSell) {
      setShares(maxSharesToSell.toString());
      return;
    }
    setShares(value);
    if (value && price && orderType === 'trade') {
      const autoComm = calculateAutoCommission(value);
      setCommission(autoComm.toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!ticker.trim()) {
      setError('Ticker is required');
      return;
    }
    if (!shares || parseFloat(shares) <= 0) {
      setError('Enter valid shares (> 0)');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Enter valid price (> 0)');
      return;
    }
    // Validate max shares for sell orders
    if (initialTicker && side === 'sell' && parseFloat(shares) > maxSharesToSell) {
      setError(`Cannot sell more than ${maxSharesToSell} share${maxSharesToSell !== 1 ? 's' : ''}`);
      return;
    }

    const autoComm = orderType === 'order' ? 0 : calculateAutoCommission(shares);

    try {
      await onAddTrade({
        ticker: ticker.trim().toUpperCase(),
        side,
        shares: parseFloat(shares),
        price: parseFloat(price),
        commission: parseFloat(commission) || autoComm,
        orderType,
        currency,
        baseCurrency: baseCurrency.trim() || null,
        instrumentType,
        realizedPl: 0,
        realizedPlCurrency: currency,
        parentOrderId: null,
      });

      // Reset form
      setTicker('');
      setSide('buy');
      setShares('');
      setPrice('');
      setCommission('');
      setOrderType('trade');
      setCurrency('USD');
      setInstrumentType('stock');
      setBaseCurrency('');
      
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError('Failed to add trade');
    }
  };

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
          {initialTicker && side === 'sell' ? 'Sell' : `Add ${orderType === 'order' ? 'Order' : 'Trade'}`}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-500 light:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 light:hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Toggle - hidden when selling from modal */}
        {!initialTicker && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setOrderType('trade');
                setCommission(shares ? calculateAutoCommission(shares).toFixed(2) : '');
              }}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                orderType === 'trade'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Trade
            </button>
            <button
              type="button"
              onClick={() => setOrderType('order')}
              className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                orderType === 'order'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Pending Order
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ticker */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => !initialTicker && setTicker(e.target.value.toUpperCase())}
              disabled={!!initialTicker}
              placeholder="AAPL"
              className={`w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400 ${initialTicker ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Side */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Side
            </label>
            <select
              value={side}
              onChange={(e) => !initialTicker && setSide(e.target.value)}
              disabled={!!initialTicker}
              className={`w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400 ${initialTicker ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="buy">BUY</option>
              <option value="sell">SELL</option>
            </select>
          </div>

          {/* Shares */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Shares
            </label>
            <input
              type="number"
              step="0.01"
              value={shares}
              onChange={(e) => handleSharesChange(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
            {maxSharesToSell > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 mt-1">
                Max: <button
                  type="button"
                  onClick={handleClickMax}
                  className="text-blue-400 dark:text-blue-400 light:text-blue-600 hover:text-blue-300 dark:hover:text-blue-300 light:hover:text-blue-700 hover:underline cursor-pointer font-semibold"
                >
                  {maxSharesToSell}
                </button> share{maxSharesToSell !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              {orderType === 'order' ? 'Limit Price' : 'Price'}
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (shares && orderType === 'trade') {
                  const autoComm = calculateAutoCommission(shares);
                  setCommission(autoComm.toFixed(2));
                }
              }}
              placeholder="150.00"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
          </div>

          {/* Commission - only for trades */}
          {orderType === 'trade' && (
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
                Commission
              </label>
              <input
                type="number"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder={shares ? calculateAutoCommission(shares).toFixed(2) : '1.00'}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
              />
            </div>
          )}

          {!initialTicker && (
            <>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
                  Instrument Type
                </label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
                >
                  <option value="stock">Stock</option>
                  <option value="fx">FX</option>
                  <option value="crypto">Crypto</option>
                  <option value="option">Option</option>
                </select>
              </div>

              {instrumentType === 'fx' && (
                <div>
                  <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
                    Base Currency
                  </label>
                  <input
                    type="text"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())}
                    placeholder="USD"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-400 dark:text-red-400 light:text-red-600 bg-red-500/10 dark:bg-red-500/10 light:bg-red-100 border border-red-500/20 dark:border-red-500/20 light:border-red-200 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-600 light:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-700 light:hover:bg-blue-600 disabled:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
          >
            {isLoading ? 'Adding...' : `Add ${orderType === 'order' ? 'Order' : 'Trade'}`}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 dark:bg-gray-700 light:bg-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600 light:hover:bg-gray-400 text-gray-100 dark:text-gray-100 light:text-gray-900 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
