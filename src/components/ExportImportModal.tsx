import React, { useState } from 'react';
import { X, Download, Upload, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImport: (transactions: Transaction[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onImport,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [importError, setImportError] = useState<string>('');

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Amount', 'Category', 'Date', 'PaymentMethod', 'Note', 'Tags', 'CreatedAt'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount,
      `"${t.category.replace(/"/g, '""')}"`,
      t.date,
      t.paymentMethod,
      `"${(t.note || '').replace(/"/g, '""')}"`,
      `"${(t.tags || []).join(';')}"`,
      t.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `income_expenses_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON Backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `income_expenses_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle File Upload JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid JSON format: expected an array of transactions.');
        }

        const validTxs: Transaction[] = parsed.map((item: any) => ({
          id: item.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: item.userId || 'user-demo',
          type: item.type === 'income' ? 'income' : 'expense',
          amount: Number(item.amount) || 0,
          category: item.category || 'Miscellaneous',
          date: item.date || new Date().toISOString().slice(0, 10),
          paymentMethod: item.paymentMethod || 'cash',
          note: item.note || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          syncStatus: 'pending',
        }));

        onImport(validTxs);
        setImportStatus(`Successfully imported ${validTxs.length} transaction records!`);
        setImportError('');
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse uploaded backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export &amp; Backup Data</h3>
              <p className="text-xs text-slate-500">Download spreadsheets or restore JSON files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {importStatus && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{importError}</span>
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          
          {/* Export Options */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider">
              Export ({transactions.length} Records)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex flex-col items-center justify-center space-y-1.5 font-bold text-slate-800"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Export to CSV</span>
              </button>

              <button
                id="export-json-btn"
                onClick={handleExportJSON}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex flex-col items-center justify-center space-y-1.5 font-bold text-slate-800"
              >
                <FileJson className="w-5 h-5 text-indigo-600" />
                <span>Export JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Import Option */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-700 uppercase tracking-wider">
              Restore from Backup
            </label>
            <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center space-y-2">
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                Click or drag JSON file to import
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
