import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Appearance setting row with an animated sun/moon switch.
 * Used inside the Profile modal.
 */
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, isSystemDefault, resetToSystem } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/40 transition-colors">
      <div className="flex items-center space-x-3">
        <div
          className={`p-2 rounded-xl shadow-sm transition-colors ${
            isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-100 text-amber-600'
          }`}
        >
          {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-900">Appearance</div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
            {isSystemDefault ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                <Monitor className="w-3 h-3" /> System
              </span>
            ) : (
              <button
                id="theme-reset-system-btn"
                type="button"
                onClick={resetToSystem}
                className="text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                Use system
              </button>
            )}
          </div>
        </div>
      </div>

      <button
        id="theme-toggle-switch"
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={toggleTheme}
        className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
          isDark
            ? 'bg-gradient-to-r from-indigo-600 to-violet-700 border-indigo-400/40'
            : 'bg-gradient-to-r from-amber-300 to-orange-400 border-amber-300'
        }`}
      >
        {/* Track icons */}
        <Sun className="absolute left-2 w-3.5 h-3.5 text-white/90" />
        <Moon className="absolute right-2 w-3.5 h-3.5 text-white/90" />
        {/* Knob */}
        <span
          className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
            isDark ? 'translate-x-9' : 'translate-x-1'
          }`}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </span>
      </button>
    </div>
  );
};
