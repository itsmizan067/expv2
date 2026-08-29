import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Percent, 
  AlertTriangle, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';
import { CURRENCY_SYMBOLS } from '../lib/constants';

interface DashboardStatsProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number;
  monthlyBudgetLimit: number;
  currency: string;
  onOpenNewIncome: () => void;
  onOpenNewExpense: () => void;
  onOpenBudget: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalIncome,
  totalExpense,
  netBalance,
  savingsRate,
  monthlyBudgetLimit,
  currency,
  onOpenNewIncome,
  onOpenNewExpense,
  onOpenBudget,
}) => {
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  // Budget calculations
  const budgetUsagePercent = monthlyBudgetLimit > 0 ? (totalExpense / monthlyBudgetLimit) * 100 : 0;
  const isBudgetWarning = budgetUsagePercent >= 80 && budgetUsagePercent < 100;
  const isBudgetExceeded = budgetUsagePercent >= 100;
  const remainingBudget = Math.max(0, monthlyBudgetLimit - totalExpense);

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-4">
      
      {/* Top 4 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Savings Balance */}
        <div id="stat-card-balance" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Balance</span>
            <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {sym}{formatAmount(netBalance)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <span>{netBalance >= 0 ? 'Surplus Available' : 'Deficit / Overdrawn'}</span>
            </p>
          </div>
          <div className={`h-1 absolute bottom-0 left-0 right-0 ${netBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>

        {/* Total Income Card */}
        <div id="stat-card-income" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700">
              +{sym}{formatAmount(totalIncome)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">Earnings recorded</span>
              <button
                id="quick-add-income-btn"
                onClick={onOpenNewIncome}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-0.5"
              >
                <span>+ Income</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-1 absolute bottom-0 left-0 right-0 bg-emerald-500" />
        </div>

        {/* Total Expense Card */}
        <div id="stat-card-expense" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expense</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600">
              -{sym}{formatAmount(totalExpense)}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">Outflows recorded</span>
              <button
                id="quick-add-expense-btn"
                onClick={onOpenNewExpense}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-0.5"
              >
                <span>+ Expense</span>
                <ArrowDownRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="h-1 absolute bottom-0 left-0 right-0 bg-rose-500" />
        </div>

        {/* Savings Rate Card */}
        <div id="stat-card-savings-rate" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Savings Rate</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-sky-700">
              {savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {savingsRate >= 20 ? 'Target achieved (≥20%)' : 'Below 20% healthy threshold'}
            </p>
          </div>
          <div className="h-1 absolute bottom-0 left-0 right-0 bg-sky-500" />
        </div>

      </div>

      {/* Monthly Budget Tracker Bar Card */}
      <div id="monthly-budget-card" className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${
              isBudgetExceeded ? 'bg-rose-100 text-rose-700' : isBudgetWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {isBudgetExceeded ? (
                <ShieldAlert className="w-5 h-5" />
              ) : isBudgetWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Budget Threshold</h3>
              <p className="text-xs text-slate-500">
                Limit: <strong className="text-slate-800">{sym}{formatAmount(monthlyBudgetLimit)}</strong> • Spent: <strong className="text-slate-800">{sym}{formatAmount(totalExpense)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right text-xs">
              <span className="text-slate-500">Remaining Allowance:</span>{' '}
              <strong className={`font-bold ${remainingBudget === 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {sym}{formatAmount(remainingBudget)}
              </strong>
            </div>
            <button
              id="edit-budget-limit-btn"
              onClick={onOpenBudget}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Adjust
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5">
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isBudgetExceeded
                  ? 'bg-rose-600'
                  : isBudgetWarning
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
            <span>0%</span>
            <span>
              {budgetUsagePercent.toFixed(0)}% utilized{' '}
              {isBudgetExceeded && <strong className="text-rose-600 font-bold">(Exceeded Limit!)</strong>}
              {isBudgetWarning && <strong className="text-amber-600 font-bold">(Near Limit)</strong>}
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>

    </div>
  );
};
