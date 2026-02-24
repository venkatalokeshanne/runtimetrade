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
  const [usdAmount, setUsdAmount] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [orderType, setOrderType] = useState('trade');
  const [currency, setCurrency] = useState('USD');
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

  const COMMISSION_PER_SHARE = 0.005;
  const COMMISSION_MIN = 1.0;

  const calculateSharesFromUsd = (usdValue, priceValue, includeCommission = true) => {
    const parsedUsd = parseFloat(usdValue);
    const parsedPrice = parseFloat(priceValue);
    if (!parsedUsd || !parsedPrice) return 0;

    if (!includeCommission) {
      return parsedUsd / parsedPrice;
    }

    const sharesWithMin = (parsedUsd - COMMISSION_MIN) / parsedPrice;
    const minCommissionShareCap = COMMISSION_MIN / COMMISSION_PER_SHARE;
    if (sharesWithMin > 0 && sharesWithMin < minCommissionShareCap) {
      return sharesWithMin;
    }

    const sharesWithPer = parsedUsd / (parsedPrice + COMMISSION_PER_SHARE);
    return sharesWithPer > 0 ? sharesWithPer : 0;
  };

  const getEffectiveShares = (priceValue = price, usdValue = usdAmount) => {
    return calculateSharesFromUsd(usdValue, priceValue, false);
  };

  const handleClickMax = () => {
    setError('');
    const effectivePrice = currentPrice > 0 ? currentPrice : parseFloat(price) || 0;

    if (effectivePrice <= 0) {
      setError('Enter price to calculate max by USD');
      return;
    }
    setPrice(effectivePrice.toString());
    const autoComm = calculateAutoCommission(maxSharesToSell);
    const maxUsd = maxSharesToSell * effectivePrice;
    setUsdAmount(maxUsd.toFixed(2));
    setCommission(autoComm.toFixed(2));
  };

  const calculateAutoCommission = (sharesValue) => {
    return calculateCommission(parseFloat(sharesValue) || 0);
  };

  const handleUsdChange = (value) => {
    setUsdAmount(value);
    if (value && price) {
      const effectiveShares = getEffectiveShares(price, value);
      if (effectiveShares > 0) {
        const autoComm = calculateAutoCommission(effectiveShares);
        setCommission(autoComm.toFixed(2));
      }
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
    if (!usdAmount || parseFloat(usdAmount) <= 0) {
      setError('Enter valid USD amount (> 0)');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Enter valid price (> 0)');
      return;
    }

    const effectiveShares = getEffectiveShares();
    if (!effectiveShares || effectiveShares <= 0) {
      setError('Enter a USD amount that yields shares (> 0)');
      return;
    }
    // Validate max shares for sell orders
    if (initialTicker && side === 'sell' && effectiveShares > maxSharesToSell) {
      setError(`Cannot sell more than ${maxSharesToSell} share${maxSharesToSell !== 1 ? 's' : ''}`);
      return;
    }

    const autoComm = calculateAutoCommission(effectiveShares);

    try {
      await onAddTrade({
        ticker: ticker.trim().toUpperCase(),
        side,
        shares: effectiveShares,
        price: parseFloat(price),
        commission: parseFloat(commission) || autoComm,
        orderType,
        currency,
        baseCurrency: null,
        instrumentType: 'stock',
        realizedPl: 0,
        realizedPlCurrency: currency,
        parentOrderId: null,
      });

      // Reset form
      setTicker('');
      setSide('buy');
      setUsdAmount('');
      setPrice('');
      setCommission('');
      setOrderType('trade');
      setCurrency('USD');
      
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
                const effectiveShares = getEffectiveShares();
                setCommission(effectiveShares ? calculateAutoCommission(effectiveShares).toFixed(2) : '');
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
          <div className="order-1">
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
          <div className="order-2">
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

          {/* Price */}
          <div className="order-3">
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              {orderType === 'order' ? 'Limit Price' : 'Price'}
            </label>
            <input
              type="number"
              step={orderType === 'order' ? 'any' : '0.01'}
              value={price}
              onChange={(e) => {
                const nextPrice = e.target.value;
                setPrice(nextPrice);
                const nextShares = getEffectiveShares(nextPrice, usdAmount);
                if (nextShares > 0) {
                  const autoComm = calculateAutoCommission(nextShares);
                  setCommission(autoComm.toFixed(2));
                }
              }}
              placeholder="150.00"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
          </div>

          {/* USD Amount */}
          <div className="order-4">
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              USD Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={usdAmount}
              onChange={(e) => handleUsdChange(e.target.value)}
              placeholder="1000.00"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 mt-1">
              Est {getEffectiveShares().toFixed(4)}
            </p>
            {maxSharesToSell > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 mt-1">
                Max: <button
                  type="button"
                  onClick={handleClickMax}
                  className="text-blue-400 dark:text-blue-400 light:text-blue-600 hover:text-blue-300 dark:hover:text-blue-300 light:hover:text-blue-700 hover:underline cursor-pointer font-semibold"
                >
                  Use Max
                </button> ({maxSharesToSell} share{maxSharesToSell !== 1 ? 's' : ''})
              </p>
            )}
          </div>

          <div className="order-5">
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Commission
            </label>
            <input
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder={getEffectiveShares() ? calculateAutoCommission(getEffectiveShares()).toFixed(2) : '1.00'}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
          </div>

          {!initialTicker && (
            <>
              <div className="order-6">
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
