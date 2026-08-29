import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  Edit3, 
  Calendar, 
  Tag, 
  Cloud, 
  CloudOff, 
  FileText,
  CreditCard,
  Building,
  Smartphone,
  Coins,
  Banknote
} from 'lucide-react';
import { Transaction } from '../types';
import { CURRENCY_SYMBOLS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants';

interface TransactionListProps {
  transactions: Transaction[];
  currency: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  currency,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sym = CURRENCY_SYMBOLS[currency] || '$';

  // Extract unique categories from current transactions
  const allCategories = Array.from(new Set(transactions.map(t => t.category)));

  // Filter transactions
  const filtered = transactions.filter(tx => {
    if (tx.isDeleted) return false;
    
    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

    // Category filter
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

    // Date filter
    if (dateFilter && !tx.date.startsWith(dateFilter)) return false;

    // Search query in note, category, or tags
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCategory = tx.category.toLowerCase().includes(q);
      const matchNote = tx.note.toLowerCase().includes(q);
      const matchTags = tx.tags?.some(tag => tag.toLowerCase().includes(q));
      const matchAmount = tx.amount.toString().includes(q);
      if (!matchCategory && !matchNote && !matchTags && !matchAmount) return false;
    }

    return true;
  });

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="w-3.5 h-3.5 text-slate-500" />;
      case 'bank_transfer':
        return <Building className="w-3.5 h-3.5 text-slate-500" />;
      case 'mobile_wallet':
        return <Smartphone className="w-3.5 h-3.5 text-slate-500" />;
      case 'cash':
        return <Banknote className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Coins className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {transactions.length} record{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-transactions-input"
              type="text"
              placeholder="Search category, note, tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          
          {/* Type filters */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs">
            <button
              id="filter-type-all-btn"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              id="filter-type-income-btn"
              onClick={() => setTypeFilter('income')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                typeFilter === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
            <button
              id="filter-type-expense-btn"
              onClick={() => setTypeFilter('expense')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${
                typeFilter === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expenses
            </button>
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              id="filter-category-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Month / Date Filter */}
          <div className="flex items-center space-x-1">
            <input
              id="filter-month-input"
              type="month"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline px-1"
              >
                Clear
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No transactions found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || dateFilter
              ? 'Try clearing your filters to see more results.'
              : 'Add your first income or expense transaction to start tracking!'}
          </p>
          <button
            id="empty-state-add-btn"
            onClick={onAddNew}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center space-x-1"
          >
            <span>+ Add New Transaction</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {filtered.map(tx => {
            const isIncome = tx.type === 'income';
            const catColor = getCategoryColor(tx.category, tx.type);
            const isPendingSync = tx.syncStatus === 'pending';

            return (
              <div
                key={tx.id}
                id={`tx-row-${tx.id}`}
                className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
              >
                {/* Left info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {tx.category}
                      </span>
                      
                      {/* Cloud Sync Status Indicator */}
                      {isPendingSync ? (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                          <CloudOff className="w-3 h-3 text-amber-500" />
                          <span>Local Only (Pending Sync)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                          <Cloud className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">Synced</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{tx.date}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 capitalize">
                        {getMethodIcon(tx.paymentMethod)}
                        <span>{tx.paymentMethod.replace('_', ' ')}</span>
                      </span>
                      {tx.note && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-slate-600 italic truncate max-w-[200px]">
                            &quot;{tx.note}&quot;
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tags */}
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1.5 flex-wrap">
                        {tx.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center space-x-0.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Amount & Actions */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm sm:text-base font-extrabold tracking-tight ${
                        isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{sym}{formatAmount(tx.amount)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    <button
                      id={`edit-tx-${tx.id}`}
                      onClick={() => onEdit(tx)}
                      title="Edit Transaction"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    
                    {confirmDeleteId === tx.id ? (
                      <div className="flex items-center space-x-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                        <button
                          onClick={() => {
                            onDelete(tx.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-500 text-[10px] px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`delete-tx-${tx.id}`}
                        onClick={() => setConfirmDeleteId(tx.id)}
                        title="Delete Transaction"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
