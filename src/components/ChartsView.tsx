import React, { useState } from 'react';
import { Transaction } from '../types';
import { CURRENCY_SYMBOLS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants';
import { PieChart, BarChart3, Layers, Calendar } from 'lucide-react';

interface ChartsViewProps {
  transactions: Transaction[];
  currency: string;
}

export const ChartsView: React.FC<ChartsViewProps> = ({ transactions, currency }) => {
  const [chartTimeframe, setChartTimeframe] = useState<'month' | 'all'>('month');
  const sym = CURRENCY_SYMBOLS[currency] || '$';

  // Filter transactions based on timeframe
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const filteredTxs = chartTimeframe === 'month'
    ? transactions.filter(t => t.date.startsWith(currentMonthPrefix) && !t.isDeleted)
    : transactions.filter(t => !t.isDeleted);

  // Group by Category for Expenses
  const expenseByCategory: Record<string, number> = {};
  let totalExpenseAmount = 0;

  // Group by Category for Income
  const incomeByCategory: Record<string, number> = {};
  let totalIncomeAmount = 0;

  // Group by Payment Method
  const expenseByMethod: Record<string, number> = {};

  filteredTxs.forEach(t => {
    if (t.type === 'expense') {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      totalExpenseAmount += t.amount;
      expenseByMethod[t.paymentMethod] = (expenseByMethod[t.paymentMethod] || 0) + t.amount;
    } else {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      totalIncomeAmount += t.amount;
    }
  });

  const sortedExpenseCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1]);

  const sortedIncomeCategories = Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1]);

  // Color mapping
  const getCategoryColor = (catName: string, type: 'income' | 'expense') => {
    const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const found = list.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return found ? found.color : '#64748b';
  };

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Timeframe selector header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Financial Visual Analytics</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs">
            <button
              id="timeframe-month-btn"
              onClick={() => setChartTimeframe('month')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                chartTimeframe === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Current Month
            </button>
            <button
              id="timeframe-all-btn"
              onClick={() => setChartTimeframe('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                chartTimeframe === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Recorded History
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expense Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">Expense Breakdown by Category</h3>
            </div>
            <span className="text-xs font-bold text-rose-600">
              Total: {sym}{formatAmount(totalExpenseAmount)}
            </span>
          </div>

          {sortedExpenseCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No expense transactions recorded in this period.
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {sortedExpenseCategories.map(([category, amount]) => {
                const percentage = totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
                const color = getCategoryColor(category, 'expense');

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-800">{category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">
                          {sym}{formatAmount(amount)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 min-w-[36px] text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Bar visual */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Income Sources Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Income Sources Breakdown</h3>
            </div>
            <span className="text-xs font-bold text-emerald-600">
              Total: {sym}{formatAmount(totalIncomeAmount)}
            </span>
          </div>

          {sortedIncomeCategories.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No income transactions recorded in this period.
            </div>
          ) : (
            <div className="mt-4 space-y-3.5">
              {sortedIncomeCategories.map(([category, amount]) => {
                const percentage = totalIncomeAmount > 0 ? (amount / totalIncomeAmount) * 100 : 0;
                const color = getCategoryColor(category, 'income');

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-800">{category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">
                          {sym}{formatAmount(amount)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 min-w-[36px] text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Bar visual */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Payment Methods Utilization */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Expenses by Payment Channel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(expenseByMethod).map(([method, amount]) => (
            <div key={method} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block capitalize">
                {method.replace('_', ' ')}
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {sym}{formatAmount(amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
