'use client';

import { useState } from 'react';

export default function DepositWithdrawalForm({ onAdd, isLoading = false, onClose = null }) {
  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter valid amount (> 0)');
      return;
    }

    try {
      await onAdd({
        type,
        amount: parseFloat(amount),
        description: description.trim(),
      });

      // Reset form
      setType('deposit');
      setAmount('');
      setDescription('');

      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError('Failed to add deposit/withdrawal');
    }
  };

  return (
    <div className="p-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-100 dark:text-gray-100 light:text-gray-900">
          Add Deposit / Withdrawal
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
        {/* Type Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              type === 'deposit'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setType('withdrawal')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              type === 'withdrawal'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Withdrawal
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Amount */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000.00"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 dark:text-gray-400 light:text-gray-700 font-mono block mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bank transfer, ATM withdrawal, etc."
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 dark:bg-slate-900 light:bg-white border border-gray-700 dark:border-gray-700 light:border-gray-300 rounded text-gray-100 dark:text-gray-100 light:text-gray-900 placeholder-gray-600 dark:placeholder-gray-600 light:placeholder-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-500 light:focus:border-gray-400"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-500 light:text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add'}
        </button>
      </form>
    </div>
  );
}
