'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, getUser, getTrades, addTrade, deleteTrade, updateTrade, getDepositsWithdrawals, addDepositWithdrawal, deleteDepositWithdrawal } from '@/lib/supabase/client';
import { aggregatePositions, calculatePositionMetrics, calculatePortfolioSummary, formatCurrency, formatPercent, formatNumber, getPnLColor } from '@/lib/utils/positions';
import PortfolioTable from '@/components/PortfolioTable';
import PendingOrders from '@/components/PendingOrders';
import TradeHistoryTable from '@/components/TradeHistoryTable';
import DepositWithdrawalTable from '@/components/DepositWithdrawalTable';
import TradeForm from '@/components/TradeForm';
import DepositWithdrawalForm from '@/components/DepositWithdrawalForm';
import ThemeToggle from '@/components/ThemeToggle';
import MarketStream from '@/components/MarketStream';
import { signOut } from '@/lib/supabase/client';

export default function PortfolioDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trades, setTrades] = useState([]);
  const [basePositions, setBasePositions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currentPrices, setCurrentPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellData, setSellData] = useState({ ticker: '', maxShares: 0, currentPrice: 0 });
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [currency, setCurrency] = useState('USD');
  const [deposits, setDeposits] = useState([]);
  const [isAddingDeposit, setIsAddingDeposit] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
    fetchExchangeRate();

    // Poll exchange rate every 30 seconds
    const interval = setInterval(fetchExchangeRate, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchExchangeRate() {
    try {
      const response = await fetch('/api/alt/quote?symbols=EUR%3DX');
      const data = await response.json();
      if (data?.data?.[0]?.price > 0) {
        setExchangeRate(data.data[0].price);
      }
    } catch (error) {
      console.error('Error fetching EUR/USD rate:', error);
      setExchangeRate(1.0);
    }
  }

  useEffect(() => {
    const positionsWithPrices = basePositions.map((position) => {
      const price = currentPrices[position.ticker] ?? position.currentPrice ?? position.avgPrice ?? 0;
      return calculatePositionMetrics(position, price);
    });
    const nonNegativePositions = positionsWithPrices.filter((position) => position.shares > 0);
    setPositions(nonNegativePositions);

    const baseSummary = calculatePortfolioSummary(nonNegativePositions);
    const cashFromDeposits = (deposits || []).reduce((total, item) => {
      const amount = Number(item.amount) || 0;
      return total + (item.type === 'withdrawal' ? -amount : amount);
    }, 0);
    const cashFromTrades = (trades || [])
      .filter((trade) => (trade.order_type || 'trade') === 'trade')
      .reduce((total, trade) => {
        const shares = Number(trade.shares) || 0;
        const price = Number(trade.price) || 0;
        const commission = Number(trade.commission) || 0;
        const gross = shares * price;
        if (String(trade.side || '').toLowerCase() === 'sell') {
          return total + (gross - commission);
        }
        return total - (gross + commission);
      }, 0);
    const cashBalance = cashFromDeposits + cashFromTrades;
    const totalCommissions = (trades || [])
      .filter((trade) => (trade.order_type || 'trade') === 'trade')
      .reduce((total, trade) => total + (Number(trade.commission) || 0), 0);

    setSummary({
      ...baseSummary,
      netLiquidationValue: baseSummary.netLiquidationValue + cashBalance,
      totalCommissions,
    });
  }, [basePositions, currentPrices, deposits, trades]);

  async function checkAuthAndLoadData() {
    try {
      const session = await getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const currentUser = await getUser();
      if (!currentUser) {
        console.warn('No user found despite valid session');
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Load trades
      const userTrades = await getTrades(currentUser.id);
      setTrades(userTrades || []);

      // Load deposits/withdrawals
      const userDeposits = await getDepositsWithdrawals(currentUser.id);
      setDeposits(userDeposits || []);

      // Aggregate positions from trades
      const aggregated = aggregatePositions(userTrades || []);
      setBasePositions(aggregated);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddTrade = useCallback(async (tradeData) => {
    setIsAddingTrade(true);
    try {
      const newTrade = await addTrade(user.id, tradeData);
      if (newTrade) {
        const updatedTrades = [...trades, newTrade];
        setTrades(updatedTrades);

        // Re-aggregate positions (will exclude orders automatically)
        const aggregated = aggregatePositions(updatedTrades);
        setBasePositions(aggregated);
        setIsAddTradeOpen(false);
      }
    } catch (error) {
      console.error('Error adding trade:', error);
    } finally {
      setIsAddingTrade(false);
    }
  }, [user, trades]);

  const handleFillOrder = useCallback(async (orderId) => {
    try {
      // Find the order
      const order = trades.find(t => t.id === orderId);
      if (!order) return;

      // Update only the order_type field to convert order to trade
      const filled = await updateTrade(orderId, { 
        order_type: 'trade' 
      });

      if (filled) {
        const updatedTrades = trades.map(t => t.id === orderId ? { ...t, order_type: 'trade' } : t);
        setTrades(updatedTrades);

        // Re-aggregate positions
        const aggregated = aggregatePositions(updatedTrades);
        setBasePositions(aggregated);
      }
    } catch (error) {
      console.error('Error filling order:', error);
    }
  }, [trades]);

  const handleDeleteOrder = useCallback(async (orderId) => {
    try {
      const success = await deleteTrade(orderId);
      if (success) {
        const updatedTrades = trades.filter(t => t.id !== orderId);
        setTrades(updatedTrades);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  }, [trades]);

  const handleDeleteTrade = useCallback(async (tradeId) => {
    try {
      const success = await deleteTrade(tradeId);
      if (success) {
        const updatedTrades = trades.filter(t => t.id !== tradeId);
        setTrades(updatedTrades);

        // Re-aggregate positions
        const aggregated = aggregatePositions(updatedTrades);
        setBasePositions(aggregated);
      }
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  }, [trades]);

  const formatEUR = (usdValue) => {
    const eurValue = usdValue * exchangeRate;
    return `€${eurValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyValue = (usdValue) => {
    if (currency === 'EUR') {
      return formatEUR(usdValue);
    }
    return formatCurrency(usdValue);
  };

  const handlePriceChange = useCallback((ticker, price) => {
    setCurrentPrices((prev) => ({ ...prev, [ticker]: price }));
  }, []);

  const handleSellClick = useCallback((ticker, maxShares) => {
    const currentPrice = currentPrices[ticker] || 0;
    setSellData({ ticker, maxShares, currentPrice });
    setIsSellModalOpen(true);
  }, [currentPrices]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [router]);

  const handleAddDeposit = useCallback(async (depositData) => {
    setIsAddingDeposit(true);
    try {
      const newDeposit = await addDepositWithdrawal(user.id, depositData);
      if (newDeposit) {
        const updatedDeposits = [...deposits, newDeposit];
        setDeposits(updatedDeposits);
      }
    } catch (error) {
      console.error('Error adding deposit/withdrawal:', error);
    } finally {
      setIsAddingDeposit(false);
    }
  }, [user?.id, deposits]);

  const handleDeleteDeposit = useCallback(async (depositId) => {
    try {
      const success = await deleteDepositWithdrawal(depositId);
      if (success) {
        const updatedDeposits = deposits.filter(d => d.id !== depositId);
        setDeposits(updatedDeposits);
      }
    } catch (error) {
      console.error('Error deleting deposit/withdrawal:', error);
    }
  }, [deposits]);

  // Separate trades and orders
  const pendingOrders = useMemo(() => trades.filter(t => (t.order_type || 'trade') === 'order'), [trades]);

  // Memoize symbols array to prevent MarketStream re-triggers
  const symbols = useMemo(() => basePositions.map((position) => position.ticker), [basePositions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 dark:text-gray-400 light:text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-slate-950/85 via-slate-900/70 to-slate-950/85 backdrop-blur light:border-black/10 light:from-white/90 light:via-gray-100/80 light:to-white/90">
        <div className="max-w-full mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900 tracking-tight">
                RuntimeTrade
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white/80 light:border-black/10 px-2 py-1">
              <ThemeToggle />
              <button
                onClick={() => setIsAddTradeOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Trade
                </span>
              </button>
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Deposit
                </span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 border border-white/10 dark:border-white/10 light:border-black/10 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </span>
              </button>
              <button
                onClick={() => setCurrency(currency === 'USD' ? 'EUR' : 'USD')}
                className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-300 dark:text-gray-300 light:text-gray-700 border border-white/10 dark:border-white/10 light:border-black/10 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-black/5 transition-colors"
              >
                {currency === 'USD' ? '€' : '$'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-6 py-8">
        <MarketStream
          symbols={symbols}
          onPrice={handlePriceChange}
        />
        {/* Summary Bar */}
        {summary && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Net Liquidation Value */}
            <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase tracking-wider mb-1">
                Net Liquidation
              </div>
              <div className="text-lg font-mono font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
                {formatCurrency(summary.netLiquidationValue)}
              </div>
            </div>

            {/* Total Unrealized P&L */}
            <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase tracking-wider mb-1">
                Unrealized P&L ({currency})
              </div>
              <div className={`text-lg font-mono font-semibold ${getPnLColor(summary.totalUnrealizedPnL)}`}>
                {formatCurrencyValue(summary.totalUnrealizedPnL)}
              </div>
            </div>

            {/* Total Realized P&L */}
            <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase tracking-wider mb-1">
                Realized P&L ({currency})
              </div>
              <div className={`text-lg font-mono font-semibold ${getPnLColor(summary.totalRealizedPnL)}`}>
                {formatCurrencyValue(summary.totalRealizedPnL)}
              </div>
            </div>

            {/* Total Return % */}
            <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase tracking-wider mb-1">
                Total Return %
              </div>
              <div className={`text-lg font-mono font-semibold ${getPnLColor(summary.totalReturnPercent)}`}>
                {formatPercent(summary.totalReturnPercent)}
              </div>
            </div>

            {/* Total Commissions */}
            <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-100 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded px-4 py-3">
              <div className="text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 uppercase tracking-wider mb-1">
                Commissions
              </div>
              <div className="text-lg font-mono font-semibold text-gray-400 dark:text-gray-400 light:text-gray-600">
                {formatCurrency(summary.totalCommissions)}
              </div>
            </div>
          </div>
        )}

        {/* Add Trade Modal */}
        {isAddTradeOpen && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/50 light:bg-black/30 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-lg p-6 w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <TradeForm
                onAddTrade={handleAddTrade}
                isLoading={isAddingTrade}
                onClose={() => setIsAddTradeOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Sell Order Modal */}
        {isSellModalOpen && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/50 light:bg-black/30 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-lg p-6 w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <TradeForm
                initialTicker={sellData.ticker}
                initialSide="sell"
                maxSharesToSell={sellData.maxShares}
                currentPrice={sellData.currentPrice}
                onAddTrade={handleAddTrade}
                isLoading={isAddingTrade}
                onClose={() => setIsSellModalOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Portfolio Table */}
        <div className="bg-slate-900/30 dark:bg-slate-900/30 light:bg-gray-50 border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded">
          <PortfolioTable
            positions={positions}
            onDeleteTrade={handleDeleteTrade}
            onPriceChange={handlePriceChange}
            onSell={handleSellClick}
            exchangeRate={exchangeRate}
            currency={currency}
          />
        </div>

        {/* Pending Orders */}
        <PendingOrders
          orders={pendingOrders}
          onDeleteOrder={handleDeleteOrder}
          onFillOrder={handleFillOrder}
        />

        {/* Trade History Table */}
        <TradeHistoryTable
          positions={basePositions}
          exchangeRate={exchangeRate}
          currency={currency}
          onDeleteTrade={handleDeleteTrade}
        />

        {/* Deposit Modal */}
        {isDepositModalOpen && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/50 light:bg-black/30 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded-lg p-6 w-full max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DepositWithdrawalForm
                onAdd={handleAddDeposit}
                isLoading={isAddingDeposit}
                onClose={() => setIsDepositModalOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Deposits & Withdrawals Table */}
        <DepositWithdrawalTable deposits={deposits} exchangeRate={exchangeRate} currency={currency} onDelete={handleDeleteDeposit} />
      </main>
    </div>
  );
}
