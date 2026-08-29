import React, { useState } from 'react';
import { Download, X, Smartphone, Monitor, CheckCircle, Share, PlusSquare } from 'lucide-react';

interface InstallPromptProps {
  deferredPrompt: any;
  onInstall: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  deferredPrompt,
  onInstall,
  isOpen,
  onClose,
}) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  if (!isOpen && !showGuideModal) return null;

  return (
    <>
      {/* Floating Bottom Install Banner */}
      {isOpen && !showGuideModal && (
        <aside
          id="pwa-install-banner"
          aria-label="Install App"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 z-50 animate-in fade-in slide-in-from-bottom duration-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Install Income Expense App</h4>
                <p className="text-xs text-slate-300">
                  Enjoy full offline functionality &amp; launch like a native app.
                </p>
              </div>
            </div>
            <button
              id="close-install-banner-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center space-x-2">
            {deferredPrompt ? (
              <button
                id="pwa-native-install-action-btn"
                onClick={onInstall}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </button>
            ) : (
              <button
                id="pwa-guide-action-btn"
                onClick={() => setShowGuideModal(true)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <span>How to Install</span>
              </button>
            )}
            <button
              id="pwa-maybe-later-btn"
              onClick={onClose}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Later
            </button>
          </div>
        </aside>
      )}

      {/* Guide Modal for iOS & Desktop installation */}
      {showGuideModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Install as Portable Web App (PWA)</h3>
              </div>
              <button
                id="close-guide-modal-btn"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs sm:text-sm text-slate-600">
              {isIOS ? (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-900">On iPhone / iPad (Safari):</p>
                  <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Share className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>1. Tap the <strong>Share</strong> button at the bottom of Safari browser.</span>
                  </div>
                  <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <PlusSquare className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                    <span>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                  </div>
                  <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>3. Tap <strong>Add</strong> in the top right corner. Done!</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 font-semibold text-slate-900">
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <span>On Laptop / Chrome / Edge / Android:</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-start space-x-2">
                      <Download className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Look for the <strong>Install</strong> icon in your browser URL address bar (top right).</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Smartphone className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                      <span>Or click the 3-dots menu &gt; <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to phone&quot;</strong>.</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Once installed, you can launch the app from your home screen or desktop anytime — even with zero internet!
                </span>
              </div>
            </div>

            <button
              id="dismiss-guide-modal-btn"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
