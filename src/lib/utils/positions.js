'use client';

/**
 * Position Aggregation Utilities
 * Calculates portfolio positions from individual trades
 * Handles weighted averages, cost basis, and P&L
 */

const COMMISSION_PER_SHARE = 0.005;
const COMMISSION_MIN = 1.0;

/**
 * Calculate IBKR Pro commission for a given share count
 * $0.005 per share with $1 minimum
 */
export function calculateCommission(shares) {
  return Math.max(shares * COMMISSION_PER_SHARE, COMMISSION_MIN);
}

/**
 * Aggregate trades into positions
 * Computes weighted average price, cost basis, and current stats
 * Handles partial sells by reducing position
 * Excludes pending orders (orderType = 'order')
 */
export function aggregatePositions(trades = []) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return [];
  }

  const positions = {};

  // Group trades by ticker and calculate cumulative position
  // Filter out orders (only process executed trades)
  trades.filter(t => (t.order_type || 'trade') === 'trade').forEach((trade) => {
    const ticker = String(trade.ticker || '').toUpperCase();
    const side = String(trade.side || '').toLowerCase();
    const shares = Number(trade.shares) || 0;
    const price = Number(trade.price) || 0;
    
    // CRITICAL: Ensure commission is a valid number, not string or null
    let commission = Number(trade.commission);
    if (!commission || isNaN(commission) || commission <= 0) {
      commission = Math.max(shares * COMMISSION_PER_SHARE, COMMISSION_MIN);
    }

    if (!ticker || shares <= 0 || price <= 0) {
      return;
    }

    if (!positions[ticker]) {
      positions[ticker] = {
        ticker,
        totalQuantity: 0,
        totalBuyCost: 0, // includes commissions
        totalBuyShares: 0,
        totalSaleProceeds: 0, // after commissions
        totalSaleProceedsBeforeCommission: 0, // before commissions (for avg price calc)
        totalSellShares: 0,
        allTrades: [],
        totalCommissionsPaid: 0,
        totalSellCommissions: 0,
      };
    }

    const pos = positions[ticker];
    pos.allTrades.push({ ...trade, ticker, side, shares, price, commission });

    if (side === 'buy') {
      pos.totalBuyShares += shares;
      pos.totalBuyCost += shares * price + commission;
      pos.totalCommissionsPaid += commission;
      console.log(`[Aggregation] BUY ${ticker}: shares=${shares}, price=${price}, commission=${commission}, totalBuyCost=${pos.totalBuyCost}`);
    } else if (side === 'sell') {
      pos.totalSellShares += shares;
      pos.totalSaleProceedsBeforeCommission += shares * price;
      pos.totalSaleProceeds += shares * price - commission;
      pos.totalCommissionsPaid += commission;
      pos.totalSellCommissions += commission;
    }

    // Net quantity after all buys and sells
    pos.totalQuantity = pos.totalBuyShares - pos.totalSellShares;
  });

  // Convert to array and calculate final metrics
  return Object.values(positions).map((pos) => {
    const quantity = pos.totalQuantity;
    
    // Weighted average cost per share (including buy commissions)
    const avgCostPerShare = pos.totalBuyShares > 0 ? pos.totalBuyCost / pos.totalBuyShares : 0;
    
    // Total cost basis for current position (includes commissions)
    // For remaining position: proportional cost of all buys (with commissions included in totalBuyCost)
    let costBasis = 0;
    if (quantity > 0 && pos.totalBuyShares > 0) {
      // Cost basis = (remaining qty / total bought) * total cost (which includes all buy commissions)
      costBasis = (quantity / pos.totalBuyShares) * pos.totalBuyCost;
      console.log(`[CostBasis] ${pos.ticker}: qty=${quantity}, buyShares=${pos.totalBuyShares}, totalBuyCost=${pos.totalBuyCost}, costBasis=${costBasis}, commissions=${pos.totalCommissionsPaid}`);
    } else if (quantity === 0) {
      costBasis = 0;
    }
    
    // Break-even price includes commission impact on sell
    const breakEvenPrice = quantity > 0
      ? (costBasis + calculateCommission(quantity)) / quantity
      : 0;

    const realizedCostBasis = pos.totalSellShares > 0
      ? avgCostPerShare * pos.totalSellShares
      : 0;
    const realizedProceeds = pos.totalSellShares > 0
      ? pos.totalSaleProceeds
      : 0;
    const realizedPnL = pos.totalSellShares > 0
      ? realizedProceeds - realizedCostBasis
      : 0;
    
    // Sell average price (after commissions)
    const sellAvgPrice = pos.totalSellShares > 0
      ? pos.totalSaleProceeds / pos.totalSellShares
      : 0;

    return {
      ticker: pos.ticker,
      shares: quantity,
      avgPrice: avgCostPerShare,
      costBasis: costBasis,
      currentPrice: 0, // User input
      marketValue: 0, // Calculated with currentPrice
      unrealizedPnL: 0, // Calculated with currentPrice
      unrealizedPnLPercent: 0,
      realizedPnL: realizedPnL,
      realizedCostBasis: realizedCostBasis,
      realizedProceeds: realizedProceeds,
      sellAvgPrice: sellAvgPrice,
      totalSellShares: pos.totalSellShares,
      breakEvenPrice: breakEvenPrice,
      totalCommissions: pos.totalCommissionsPaid,
      tradeHistory: pos.allTrades,
    };
  });
}

/**
 * Calculate position metrics given current price
 */
export function calculatePositionMetrics(position, currentPrice) {
  const { shares, costBasis, avgPrice, breakEvenPrice, totalCommissions } = position;

  if (shares <= 0) {
    return {
      ...position,
      currentPrice,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    };
  }

  if (!currentPrice || currentPrice <= 0) {
    return {
      ...position,
      currentPrice: 0,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    };
  }

  const marketValue = shares * currentPrice;
  const unrealizedPnL = marketValue - costBasis;
  const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

  return {
    ...position,
    currentPrice,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

/**
 * Calculate portfolio-level summary stats
 */
export function calculatePortfolioSummary(positions = []) {
  const summary = {
    netLiquidationValue: 0,
    totalCostBasis: 0,
    totalUnrealizedPnL: 0,
    totalUnrealizedPnLPercent: 0,
    totalRealizedPnL: 0,
    totalRealizedCostBasis: 0,
    totalReturnPercent: 0,
    totalCommissions: 0,
    positionCount: 0,
  };

  positions.forEach((pos) => {
    summary.totalCommissions += pos.totalCommissions;
    summary.totalRealizedPnL += pos.realizedPnL || 0;
    summary.totalRealizedCostBasis += pos.realizedCostBasis || 0;
    if (pos.shares > 0) {
      summary.totalCostBasis += pos.costBasis;
      summary.positionCount++;
      summary.netLiquidationValue += pos.currentPrice > 0 ? pos.marketValue : pos.costBasis;
      summary.totalUnrealizedPnL += pos.unrealizedPnL;
    }
  });

  summary.totalUnrealizedPnLPercent =
    summary.totalCostBasis > 0
      ? (summary.totalUnrealizedPnL / summary.totalCostBasis) * 100
      : 0;

  const totalPnL = summary.totalUnrealizedPnL + summary.totalRealizedPnL;
  const totalBasis = summary.totalCostBasis + summary.totalRealizedCostBasis;
  summary.totalReturnPercent = totalBasis > 0 ? (totalPnL / totalBasis) * 100 : 0;

  return summary;
}

/**
 * Format currency for display
 */
export function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Format number (shares) for display
 */
export function formatNumber(value, decimals = 0) {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage for display
 */
export function formatPercent(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) return '0.00%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get P&L color class (for tailwind)
 */
export function getPnLColor(value) {
  if (value > 0) return 'text-green-500 dark:text-green-500 light:text-green-600';
  if (value < 0) return 'text-red-500 dark:text-red-500 light:text-red-600';
  return 'text-gray-400 dark:text-gray-400 light:text-gray-600';
}

/**
 * Get P&L background color class
 */
export function getPnLBgColor(value) {
  if (value > 0) return 'bg-green-500/10 dark:bg-green-500/10 light:bg-green-50';
  if (value < 0) return 'bg-red-500/10 dark:bg-red-500/10 light:bg-red-50';
  return 'bg-gray-500/10 dark:bg-gray-500/10 light:bg-gray-50';
}
