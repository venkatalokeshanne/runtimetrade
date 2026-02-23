/**
 * Trading Calculator Utilities
 * All calculations for IBKR Pro commission structure ($0.005/share, $1 min)
 */

const COMMISSION_PER_SHARE = 0.005;
const COMMISSION_MIN = 1.0;

/**
 * Calculate commission for a given number of shares
 * @param {number} shares - Total shares
 * @returns {number} Commission amount
 */
export function calculateCommission(shares) {
  return Math.max(COMMISSION_PER_SHARE * shares, COMMISSION_MIN);
}

/**
 * Calculate cost basis including buy commission
 * @param {number} shares - Total shares
 * @param {number} avgPrice - Average buy price per share
 * @returns {object} { costBasisPerShare, totalCostBasis, buyCommission }
 */
export function calculateCostBasis(shares, avgPrice) {
  const buyCommission = calculateCommission(shares);
  const grossCost = shares * avgPrice;
  const totalCostBasis = grossCost + buyCommission;
  const costBasisPerShare = totalCostBasis / shares;

  return {
    grossCost,
    buyCommission,
    totalCostBasis,
    costBasisPerShare,
  };
}

/**
 * Calculate profit/loss analysis at a target price
 * @param {number} shares - Total shares
 * @param {number} avgPrice - Average buy price
 * @param {number} targetPrice - Target sell price
 * @returns {object} Comprehensive P&L object
 */
export function calculateProfitAnalysis(shares, avgPrice, targetPrice) {
  const costBasisData = calculateCostBasis(shares, avgPrice);
  const buyCommission = costBasisData.buyCommission;
  const totalCostBasis = costBasisData.totalCostBasis;

  // Market value at target price
  const marketValue = shares * targetPrice;

  // Sell commission
  const sellCommission = calculateCommission(shares);

  // Gross profit/loss (before seller commission)
  const grossPnL = marketValue - totalCostBasis;

  // Net profit/loss (after seller commission)
  const netPnL = grossPnL - sellCommission;

  // Gross P&L percentage
  const grossPnLPercent = (grossPnL / totalCostBasis) * 100;

  // Net P&L percentage
  const netPnLPercent = (netPnL / totalCostBasis) * 100;

  // Break-even price (including both commissions)
  const breakEvenPrice = (totalCostBasis + sellCommission) / shares;

  // Profit per $0.01 move
  const profitPer1Cent = shares * 0.01 - sellCommission;

  // Profit per 1% move
  const profitPer1PercentMove = (shares * avgPrice * 0.01) - sellCommission;

  return {
    shares,
    avgPrice,
    targetPrice,
    costBasisPerShare: costBasisData.costBasisPerShare,
    buyCostPerShare: avgPrice,
    buyCommission,
    totalCostBasis,
    marketValue,
    grossPnL,
    netPnL,
    grossPnLPercent,
    netPnLPercent,
    sellCommission,
    breakEvenPrice,
    profitPer1Cent,
    profitPer1PercentMove,
  };
}

/**
 * Calculate P&L for a custom dollar move
 * @param {number} shares - Total shares
 * @param {number} avgPrice - Average buy price
 * @param {number} dollarMove - Dollar amount moved from avg price
 * @returns {object} P&L at new price point
 */
export function calculateDollarMove(shares, avgPrice, dollarMove) {
  const newPrice = avgPrice + dollarMove;
  return calculateProfitAnalysis(shares, avgPrice, newPrice);
}

/**
 * Calculate P&L for a custom percentage move
 * @param {number} shares - Total shares
 * @param {number} avgPrice - Average buy price
 * @param {number} percentMove - Percentage move (e.g., 5 for 5%)
 * @returns {object} P&L at new price point
 */
export function calculatePercentageMove(shares, avgPrice, percentMove) {
  const percentageDecimal = percentMove / 100;
  const newPrice = avgPrice * (1 + percentageDecimal);
  return calculateProfitAnalysis(shares, avgPrice, newPrice);
}

/**
 * Format currency for display
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format number for display
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage for display
 * @param {number} value - Percentage value (e.g., 5.5 for 5.5%)
 * @param {number} decimals - Number of decimal places (default 2)
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, decimals = 2) {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Determine color class based on value (profit/loss)
 * @param {number} value - The P&L value
 * @returns {string} Tailwind color class
 */
export function getPnLColor(value) {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-400';
}

/**
 * Determine background color class based on value (profit/loss)
 * @param {number} value - The P&L value
 * @returns {string} Tailwind background color class
 */
export function getPnLBgColor(value) {
  if (value > 0) return 'bg-green-500/10 border-green-500/20';
  if (value < 0) return 'bg-red-500/10 border-red-500/20';
  return 'bg-gray-500/10 border-gray-500/20';
}
