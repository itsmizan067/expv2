import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  onComplete?: (otp: string) => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
  onComplete,
}) => {
  const length = 6;
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split current value into array of 6 characters
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Extract only digits
    const cleanDigit = rawVal.replace(/\D/g, '');

    if (!cleanDigit) {
      // User erased
      const newDigits = [...digits];
      newDigits[index] = '';
      const newOtp = newDigits.join('');
      onChange(newOtp);
      return;
    }

    // If multiple digits were typed/input into one field (e.g. mobile autofill)
    if (cleanDigit.length > 1) {
      handlePastedDigits(cleanDigit.slice(0, length));
      return;
    }

    const singleDigit = cleanDigit[cleanDigit.length - 1];
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Auto-advance focus to next field
    if (singleDigit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // If all digits are filled, notify completion
    if (newOtp.length === length) {
      onComplete?.(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump back to previous box and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputsRef.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePastedDigits(pasted);
  };

  const handlePastedDigits = (pasted: string) => {
    const extracted = pasted.replace(/\D/g, '').slice(0, length);
    if (!extracted) return;

    onChange(extracted);

    // Focus either the next empty slot or the last digit
    const nextIndex = Math.min(extracted.length, length - 1);
    inputsRef.current[nextIndex]?.focus();

    if (extracted.length === length) {
      onComplete?.(extracted);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 my-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => {
        const digit = digits[index] || '';
        const isFilled = Boolean(digit);

        return (
          <input
            key={index}
            ref={el => {
              inputsRef.current[index] = el;
            }}
            id={`otp-digit-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={e => handleInputChange(index, e)}
            onKeyDown={e => handleKeyDown(index, e)}
            onFocus={e => e.target.select()}
            aria-label={`Digit ${index + 1} of ${length}`}
            autoComplete="one-time-code"
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center font-mono text-xl sm:text-2xl font-extrabold rounded-2xl border transition-all duration-200 outline-none select-none
              ${
                disabled
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                  : hasError
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-600 focus:ring-4 focus:ring-rose-500/20'
                  : isFilled
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-500 shadow-sm focus:ring-4 focus:ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-900'
              }
            `}
          />
        );
      })}
    </div>
  );
};
