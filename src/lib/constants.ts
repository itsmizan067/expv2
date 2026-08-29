export interface CategoryItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  iconName: string;
  color: string;
  bgColor: string;
}

export const INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'Salary', name: 'Salary', type: 'income', iconName: 'Briefcase', color: '#10b981', bgColor: '#ecfdf5' },
  { id: 'Freelance', name: 'Freelance', type: 'income', iconName: 'Laptop', color: '#06b6d4', bgColor: '#ecfeff' },
  { id: 'Investments', name: 'Investments', type: 'income', iconName: 'TrendingUp', color: '#6366f1', bgColor: '#eef2ff' },
  { id: 'Business', name: 'Business', type: 'income', iconName: 'Building2', color: '#8b5cf6', bgColor: '#f5f3ff' },
  { id: 'Rental Income', name: 'Rental Income', type: 'income', iconName: 'Home', color: '#14b8a6', bgColor: '#f0fdfa' },
  { id: 'Gift & Bonus', name: 'Gift & Bonus', type: 'income', iconName: 'Gift', color: '#f59e0b', bgColor: '#fffbeb' },
  { id: 'Refunds', name: 'Refunds', type: 'income', iconName: 'RotateCcw', color: '#3b82f6', bgColor: '#eff6ff' },
  { id: 'Other Income', name: 'Other Income', type: 'income', iconName: 'PlusCircle', color: '#64748b', bgColor: '#f8fafc' },
];

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'Food & Dining', name: 'Food & Dining', type: 'expense', iconName: 'Utensils', color: '#f43f5e', bgColor: '#fff1f2' },
  { id: 'Rent & Housing', name: 'Rent & Housing', type: 'expense', iconName: 'Home', color: '#e11d48', bgColor: '#ffe4e6' },
  { id: 'Utilities', name: 'Utilities', type: 'expense', iconName: 'Zap', color: '#ea580c', bgColor: '#fff7ed' },
  { id: 'Transportation', name: 'Transportation', type: 'expense', iconName: 'Car', color: '#d97706', bgColor: '#fffbeb' },
  { id: 'Groceries', name: 'Groceries', type: 'expense', iconName: 'ShoppingCart', color: '#ca8a04', bgColor: '#fefce8' },
  { id: 'Shopping', name: 'Shopping', type: 'expense', iconName: 'ShoppingBag', color: '#ec4899', bgColor: '#fdf2f8' },
  { id: 'Health & Medical', name: 'Health & Medical', type: 'expense', iconName: 'HeartPulse', color: '#ef4444', bgColor: '#fef2f2' },
  { id: 'Entertainment', name: 'Entertainment', type: 'expense', iconName: 'Film', color: '#a855f7', bgColor: '#faf5ff' },
  { id: 'Education', name: 'Education', type: 'expense', iconName: 'GraduationCap', color: '#3b82f6', bgColor: '#eff6ff' },
  { id: 'Travel', name: 'Travel', type: 'expense', iconName: 'Plane', color: '#0ea5e9', bgColor: '#f0f9ff' },
  { id: 'Personal Care', name: 'Personal Care', type: 'expense', iconName: 'Sparkles', color: '#8b5cf6', bgColor: '#f5f3ff' },
  { id: 'Miscellaneous', name: 'Miscellaneous', type: 'expense', iconName: 'MoreHorizontal', color: '#64748b', bgColor: '#f8fafc' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { id: 'debit_card', label: 'Debit Card', icon: 'CreditCard' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'Building' },
  { id: 'mobile_wallet', label: 'Mobile Wallet / App', icon: 'Smartphone' },
  { id: 'other', label: 'Other', icon: 'Coins' },
];
