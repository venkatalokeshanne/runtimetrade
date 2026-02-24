'use client';

import { formatCurrency, formatNumber } from '@/lib/utils/positions';

export default function PendingOrders({ orders, onDeleteOrder, onFillOrder }) {
  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-slate-900/40 dark:bg-slate-900/40 light:bg-white border border-slate-700 dark:border-slate-700 light:border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-700 dark:border-slate-700 light:border-gray-200">
        <h2 className="text-sm font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
          Pending Orders ({orders.length})
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 dark:border-slate-700 light:border-gray-200 bg-slate-800/30 dark:bg-slate-800/30 light:bg-gray-50">
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Ticker</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Side</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Qty</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Limit Price</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">USD Amount</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Commission</th>
              <th className="px-4 py-3 text-center text-gray-400 dark:text-gray-400 light:text-gray-600 font-mono text-xs whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-slate-700 dark:border-slate-700 light:border-gray-200 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <span className="font-mono font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
                    {order.ticker}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-mono font-semibold ${
                    order.side === 'buy'
                      ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600'
                      : 'text-red-400 dark:text-red-400 light:text-red-600'
                  }`}>
                    {order.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-gray-300 dark:text-gray-300 light:text-gray-700">
                    {formatNumber(order.shares)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-gray-300 dark:text-gray-300 light:text-gray-700">
                    {order.price !== null && order.price !== undefined ? formatNumber(order.price, 4) : '--'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-gray-300 dark:text-gray-300 light:text-gray-700">
                    {formatCurrency((Number(order.shares) || 0) * (Number(order.price) || 0))}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono text-gray-300 dark:text-gray-300 light:text-gray-700">
                    {formatCurrency(Number(order.commission) || 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onFillOrder(order.id)}
                      className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                      title="Fill this order as a trade"
                    >
                      Fill
                    </button>
                    <button
                      onClick={() => onDeleteOrder(order.id)}
                      className="px-2 py-1 text-xs bg-red-600/60 hover:bg-red-600 text-white rounded transition-colors"
                      title="Cancel this order"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
