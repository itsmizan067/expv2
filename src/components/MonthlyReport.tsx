import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Crown,
} from 'lucide-react';
import { Transaction, User } from '../types';

interface MonthlyReportProps {
  transactions: Transaction[];
  user: User;
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type ViewMode = 'month' | 'week';

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ transactions, user, currency }) => {
  const isPremium = user.plan === 'premium' && user.planStatus === 'active';
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const canAccess = isPremium || isAdmin;

  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Current ISO week start (Monday)
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Month navigation
  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Week navigation
  const prevWeek = () => setSelectedWeek(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setSelectedWeek(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; });

  // Build day rows
  const rows = useMemo(() => {
    const days: Date[] = [];

    if (viewMode === 'month') {
      const count = getDaysInMonth(selectedYear, selectedMonth);
      for (let d = 1; d <= count; d++) {
        days.push(new Date(selectedYear, selectedMonth, d));
      }
    } else {
      // 7 days starting from selectedWeek (Monday)
      for (let i = 0; i < 7; i++) {
        const d = new Date(selectedWeek);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
    }

    let runningBalance = 0;
    // Compute balance before the period using all prior transactions
    const periodStart = days[0];
    transactions.forEach(t => {
      if (t.isDeleted) return;
      const td = new Date(t.date);
      if (td < periodStart) {
        runningBalance += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    return days.map(day => {
      const dateStr = day.toISOString().slice(0, 10);
      const dayTxs = transactions.filter(t => !t.isDeleted && t.date === dateStr);
      const cashIn = dayTxs.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
      const cashOut = dayTxs.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      runningBalance += cashIn - cashOut;
      return { date: day, cashIn, cashOut, balance: runningBalance, txCount: dayTxs.length };
    });
  }, [transactions, viewMode, selectedYear, selectedMonth, selectedWeek]);

  const totalIn = rows.reduce((a, r) => a + r.cashIn, 0);
  const totalOut = rows.reduce((a, r) => a + r.cashOut, 0);
  const netChange = totalIn - totalOut;

  const exportCSV = () => {
    const header = 'Date,Cash In,Cash Out,Net Change,Running Balance,Transactions\n';
    const body = rows.map(r =>
      `"${r.date.toLocaleDateString()}",${r.cashIn},${r.cashOut},${r.cashIn - r.cashOut},${r.balance},${r.txCount}`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pocket-balance-report-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Crown className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Premium Feature</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            The Monthly Statement Report is available exclusively for <strong>Premium</strong> plan users.
            Upgrade to see day-wise Cash In, Cash Out, and Running Balance history.
          </p>
          <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
            <Crown className="w-4 h-4" />
            <span>Upgrade to Premium — ৳250/month</span>
          </div>
        </div>
      </div>
    );
  }

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const weekLabel = (() => {
    const end = new Date(selectedWeek);
    end.setDate(end.getDate() + 6);
    return `${selectedWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-50 rounded-xl border border-violet-200">
            <FileText className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Statement Report</h3>
            <p className="text-xs text-slate-500">Day-wise Cash In · Cash Out · Running Balance</p>
          </div>
          {isPremium && (
            <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold">
              <Crown className="w-3 h-3" /><span>PREMIUM</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button onClick={() => setViewMode('month')} className={`px-3 py-1 rounded-lg transition ${viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>Month</button>
            <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-lg transition ${viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>Week</button>
          </div>
          <button onClick={exportCSV} className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition">
            <Download className="w-3.5 h-3.5" /><span>CSV</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        {viewMode === 'month' ? (
          <>
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 rounded-lg transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-900 text-sm">{monthNames[selectedMonth]} {selectedYear}</span>
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 rounded-lg transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          </>
        ) : (
          <>
            <button onClick={prevWeek} className="p-1.5 hover:bg-slate-200 rounded-lg transition"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-900 text-sm">{weekLabel}</span>
            </div>
            <button onClick={nextWeek} className="p-1.5 hover:bg-slate-200 rounded-lg transition"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-px bg-slate-100">
        <div className="bg-white p-4 text-center">
          <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center justify-center space-x-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" /><span>Total Cash In</span>
          </div>
          <div className="text-lg font-extrabold text-emerald-600">{fmt(totalIn, currency)}</div>
        </div>
        <div className="bg-white p-4 text-center">
          <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center justify-center space-x-1">
            <TrendingDown className="w-3 h-3 text-rose-500" /><span>Total Cash Out</span>
          </div>
          <div className="text-lg font-extrabold text-rose-600">{fmt(totalOut, currency)}</div>
        </div>
        <div className="bg-white p-4 text-center">
          <div className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center justify-center space-x-1">
            <Wallet className="w-3 h-3 text-violet-500" /><span>Net Change</span>
          </div>
          <div className={`text-lg font-extrabold ${netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netChange >= 0 ? '+' : ''}{fmt(netChange, currency)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right text-emerald-600">Cash In</th>
              <th className="py-3 px-4 text-right text-rose-600">Cash Out</th>
              <th className="py-3 px-4 text-right">Net</th>
              <th className="py-3 px-4 text-right text-slate-700">Current Cash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row, i) => {
              const isToday = row.date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
              const net = row.cashIn - row.cashOut;
              const hasActivity = row.cashIn > 0 || row.cashOut > 0;
              return (
                <tr key={i} className={`transition-colors ${isToday ? 'bg-violet-50/60' : hasActivity ? 'hover:bg-slate-50' : 'opacity-50'}`}>
                  <td className="py-2.5 px-4">
                    <div className={`font-semibold ${isToday ? 'text-violet-700' : 'text-slate-800'}`}>
                      {dateLabel(row.date)}
                      {isToday && <span className="ml-2 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded">Today</span>}
                    </div>
                    {row.txCount > 0 && <div className="text-[10px] text-slate-400">{row.txCount} transaction{row.txCount > 1 ? 's' : ''}</div>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {row.cashIn > 0 ? <span className="font-bold text-emerald-600">+{fmt(row.cashIn, currency)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {row.cashOut > 0 ? <span className="font-bold text-rose-600">-{fmt(row.cashOut, currency)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {hasActivity ? (
                      <span className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net, currency)}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`font-bold ${row.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {fmt(row.balance, currency)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
