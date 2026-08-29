import React, { useState } from 'react';
import { X, Sliders, DollarSign, Check, Globe } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '../lib/constants';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyBudgetLimit: number;
  currentCurrency: string;
  onSave: (budget: number, currency: string) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  monthlyBudgetLimit,
  currentCurrency,
  onSave,
}) => {
  const [budget, setBudget] = useState<string>(monthlyBudgetLimit.toString());
  const [currency, setCurrency] = useState<string>(currentCurrency || 'USD');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(budget);
    onSave(isNaN(num) ? 3000 : num, currency);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Budget & Currency Preferences</h3>
              <p className="text-xs text-slate-500">Configure monthly targets and currency display</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Monthly Budget Cap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Monthly Expense Budget Limit
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {CURRENCY_SYMBOLS[currency] || '$'}
              </span>
              <input
                id="budget-limit-input"
                type="number"
                step="50"
                min="0"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              You will receive visual progress alerts as your monthly expenses approach this limit.
            </p>
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Display Currency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                <button
                  type="button"
                  key={code}
                  onClick={() => setCurrency(code)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center ${
                    currency === code
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{symbol}</span>
                  <span className="text-[10px] mt-0.5 opacity-80">{code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-budget-prefs-btn"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
