'use client';

import { formatCurrency } from '@/lib/utils/positions';

export default function DepositWithdrawalTable({ deposits = [], exchangeRate = 1.0, currency = 'USD', onDelete = null }) {
  if (deposits.length === 0) {
    return null;
  }

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
        <h3 className="text-sm font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
          Deposits & Withdrawals
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900/50 dark:bg-slate-900/50 light:bg-gray-100 border-b border-gray-700 dark:border-gray-700 light:border-gray-300">
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Type
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Amount ({currency})
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-400 light:text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Description
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
            {deposits.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-800 dark:border-gray-800 light:border-gray-200 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 light:hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2 text-center">
                  <span
                    className={`font-semibold text-sm font-mono ${
                      item.type === 'deposit'
                        ? 'text-green-500 dark:text-green-500 light:text-green-600'
                        : 'text-red-500 dark:text-red-500 light:text-red-600'
                    }`}
                  >
                    {item.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
                  {formatCurrencyValue(item.amount)}
                </td>
                <td className="px-3 py-2 text-center text-gray-400 dark:text-gray-400 light:text-gray-600">
                  {item.description || '-'}
                </td>
                <td className="px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-500 light:text-gray-600 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onDelete && onDelete(item.id)}
                    className="px-2 py-1 text-xs bg-red-600/60 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
