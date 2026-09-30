import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Wallet } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '../lib/constants';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyBudgetLimit: number;
  currentCurrency: string;
  openingBalance?: number;
  onSave: (budget: number, currency: string, openingBalance: number) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  monthlyBudgetLimit,
  currentCurrency,
  openingBalance = 0,
  onSave,
}) => {
  const [budget, setBudget] = useState<string>(monthlyBudgetLimit.toString());
  const [currency, setCurrency] = useState<string>(currentCurrency || 'USD');
  const [openBalance, setOpenBalance] = useState<string>(openingBalance.toString());

  useEffect(() => {
    if (isOpen) {
      setBudget(monthlyBudgetLimit.toString());
      setCurrency(currentCurrency || 'USD');
      setOpenBalance((openingBalance || 0).toString());
    }
  }, [isOpen, monthlyBudgetLimit, currentCurrency, openingBalance]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numBudget = parseFloat(budget);
    const numOpening = parseFloat(openBalance);
    onSave(
      isNaN(numBudget) ? 3000 : numBudget,
      currency,
      isNaN(numOpening) ? 0 : Math.max(0, numOpening)
    );
    onClose();
  };

  const sym = CURRENCY_SYMBOLS[currency] || '$';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Budget & Financial Settings</h3>
              <p className="text-xs text-slate-500">Configure starting cash, targets, and currency</p>
            </div>
          </div>
          <button
            id="close-budget-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all duration-200 hover:rotate-90 active:scale-90 shadow-2xs shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 transition-transform" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Opening Cash / Starting Balance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Opening Balance
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                <Wallet className="w-3 h-3 text-emerald-600" />
                <span>Cash in Hand</span>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {sym}
              </span>
              <input
                id="opening-balance-input"
                type="number"
                step="0.01"
                min="0"
                value={openBalance}
                onChange={e => setOpenBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Initial money in your pocket or bank balance when you started using this app.
            </p>
          </div>

          {/* Monthly Budget Cap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Monthly Expense Budget Limit
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {sym}
              </span>
              <input
                id="budget-limit-input"
                type="number"
                step="50"
                min="0"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
