import React, { useState } from 'react';
import { X, Download, Upload, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';
import { Transaction, User, BackupPayload } from '../types';
import { formatLocalDate } from '../lib/dateUtils';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentUser?: User | null;
  onImport: (
    transactions: Transaction[],
    preferences?: { currency?: string; openingBalance?: number; monthlyBudgetLimit?: number }
  ) => void;
}

interface StagedBackup {
  transactions: Transaction[];
  preferences?: {
    currency?: string;
    openingBalance?: number;
    monthlyBudgetLimit?: number;
  };
  originalAccountEmail?: string;
  exportedAt?: string;
  sourceVersion: number;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentUser,
  onImport,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  const [stagedBackup, setStagedBackup] = useState<StagedBackup | null>(null);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState<boolean>(true);

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Amount', 'Category', 'Date', 'PaymentMethod', 'Note', 'Tags', 'CreatedAt'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount,
      `"${(t.category || '').replace(/"/g, '""')}"`,
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
    link.setAttribute('download', `pocket_balance_export_${formatLocalDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Complete JSON Backup (includes transactions + opening balance + preferences)
  const handleExportJSON = () => {
    const backup: BackupPayload = {
      version: 2,
      appName: 'Pocket Balance',
      exportedAt: new Date().toISOString(),
      userPreferences: {
        currency: currentUser?.currency || 'USD',
        openingBalance: currentUser?.openingBalance || 0,
        monthlyBudgetLimit: currentUser?.monthlyBudgetLimit || 0,
      },
      transactions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `pocket_balance_backup_${currentUser?.email?.split('@')[0] || 'account'}_${formatLocalDate()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle File Upload JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportStatus('');

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let rawTxs: any[] = [];
        let prefs: StagedBackup['preferences'] = undefined;
        let sourceVer = 1;
        let originalEmail = '';
        let exportedAt = '';

        // Check format: Version 2 Backup object vs Legacy raw array
        if (Array.isArray(parsed)) {
          rawTxs = parsed;
          sourceVer = 1;
        } else if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed.transactions)) {
            throw new Error('Invalid JSON format: missing transactions list.');
          }
          rawTxs = parsed.transactions;
          sourceVer = parsed.version || 2;
          originalEmail = parsed.accountEmail || '';
          exportedAt = parsed.exportedAt || '';
          if (parsed.userPreferences) {
            prefs = {
              currency: parsed.userPreferences.currency,
              openingBalance: Number(parsed.userPreferences.openingBalance) || 0,
              monthlyBudgetLimit: Number(parsed.userPreferences.monthlyBudgetLimit) || 0,
            };
          }
        } else {
          throw new Error('Unrecognized backup file format.');
        }

        const targetUserId = currentUser?.id || 'user-demo';

        // Re-generate fresh unique IDs for all transactions and bind to targetUserId
        // This guarantees 100% collision-free restore into ANY new or different account!
        const validTxs: Transaction[] = rawTxs.map((item: any, idx: number) => ({
          id: `tx-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
          userId: targetUserId,
          type: item.type === 'income' ? 'income' : 'expense',
          amount: Math.abs(Number(item.amount)) || 0,
          category: item.category || 'Miscellaneous',
          date: item.date || formatLocalDate(),
          paymentMethod: item.paymentMethod || 'cash',
          note: item.note || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        }));

        setStagedBackup({
          transactions: validTxs,
          preferences: prefs,
          sourceVersion: sourceVer,
          originalAccountEmail: originalEmail,
          exportedAt,
        });
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse uploaded backup file');
      }
    };
    reader.readAsText(file);
    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';
  };

  // Confirm Staged Restore
  const handleConfirmRestore = () => {
    if (!stagedBackup) return;

    const prefsToApply = includeOpeningBalance ? stagedBackup.preferences : undefined;
    onImport(stagedBackup.transactions, prefsToApply);

    let msg = `Successfully restored ${stagedBackup.transactions.length} records into your account!`;
    if (includeOpeningBalance && stagedBackup.preferences?.openingBalance !== undefined) {
      msg += ` Opening balance set to ${stagedBackup.preferences.openingBalance} ${stagedBackup.preferences.currency || ''}.`;
    }
    setImportStatus(msg);
    setStagedBackup(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export &amp; Restore Data</h3>
              <p className="text-xs text-slate-500">Back up or migrate financial records to any account</p>
            </div>
          </div>
          <button
            id="close-export-import-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all duration-200 hover:rotate-90 active:scale-90 shadow-2xs shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4 transition-transform" strokeWidth={2.2} />
          </button>
        </div>

        {/* Current Active Account Indicator */}
        <div className="mt-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Active Account:</span>
          <span className="font-bold text-slate-800 flex items-center space-x-1">
            <span>{currentUser?.name || 'Local User'}</span>
            <span className="text-slate-400">({currentUser?.email || 'offline'})</span>
          </span>
        </div>

        {importStatus && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        <div className="mt-4 space-y-4 text-xs">
          
          {/* Export Options */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 uppercase tracking-wider">
              Backup &amp; Export ({transactions.length} Records)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="export-csv-btn"
                type="button"
                onClick={handleExportCSV}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition flex flex-col items-center justify-center space-y-1.5 font-bold text-slate-800 cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Export to CSV</span>
                <span className="text-[10px] text-slate-400 font-normal">Excel / Spreadsheets</span>
              </button>

              <button
                id="export-json-btn"
                type="button"
                onClick={handleExportJSON}
                className="p-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200/80 rounded-xl text-left transition flex flex-col items-center justify-center space-y-1.5 font-bold text-indigo-900 cursor-pointer"
              >
                <FileJson className="w-5 h-5 text-indigo-600" />
                <span>Full JSON Backup</span>
                <span className="text-[10px] text-indigo-600/80 font-normal">All Data + Opening Balance</span>
              </button>
            </div>
          </div>

          {/* Import / Restore Section */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                Restore to This Account
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Safe Cross-Account Migration</span>
              </span>
            </div>

            {!stagedBackup ? (
              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center space-y-2">
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">
                  Click or drag JSON backup file here
                </span>
                <span className="text-[10px] text-slate-400">
                  Can be from this account, another account, or another device
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              /* Staged Preview Before Restore */
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Backup Verified</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedBackup(null)}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="text-slate-700 space-y-1.5 bg-white p-3 rounded-xl border border-emerald-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transactions to import:</span>
                    <span className="font-bold text-slate-900">{stagedBackup.transactions.length} records</span>
                  </div>
                  {stagedBackup.preferences?.openingBalance !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Wallet className="w-3 h-3 text-emerald-600" />
                        <span>Opening Balance in file:</span>
                      </span>
                      <span className="font-bold text-emerald-700">
                        {stagedBackup.preferences.openingBalance} {stagedBackup.preferences.currency || 'USD'}
                      </span>
                    </div>
                  )}
                  {stagedBackup.originalAccountEmail && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Exported from:</span>
                      <span className="text-slate-600 italic">{stagedBackup.originalAccountEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination account:</span>
                    <span className="font-bold text-emerald-800">{currentUser?.email || 'Current Account'}</span>
                  </div>
                </div>

                {stagedBackup.preferences?.openingBalance !== undefined && (
                  <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={includeOpeningBalance}
                      onChange={e => setIncludeOpeningBalance(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Also update opening balance ({stagedBackup.preferences.openingBalance}) and currency</span>
                  </label>
                )}

                <button
                  type="button"
                  id="confirm-restore-btn"
                  onClick={handleConfirmRestore}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                >
                  <span>Confirm &amp; Restore into {currentUser?.name || 'Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
