import React, { useRef, useEffect } from 'react';
import { parseOtpPaste, getNextOtpIndex, formatOtpDigits } from '../api.js';

export { parseOtpPaste, getNextOtpIndex, formatOtpDigits };

/**
 * 4-digit auto-advancing OTP Input component with paste support & numeric keyboard
 */
export default function OtpInput({
  value = '',
  onChange,
  onComplete,
  length = 4,
  autoFocus = true,
  disabled = false,
  error = false,
  ariaLabel = 'One-time verification code',
}) {
  const inputsRef = useRef([]);

  // Ensure digits array matches length
  const digits = Array.from({ length }, (_, i) => (value && value[i] ? value[i] : ''));

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleDigitChange = (index, e) => {
    if (disabled) return;
    const inputValue = e.target.value;
    const char = inputValue.slice(-1); // Take the most recently typed character

    if (char && !/^\d$/.test(char)) return; // Only allow numeric 0-9

    const newDigits = [...digits];
    newDigits[index] = char;
    const fullValue = newDigits.join('');

    if (onChange) onChange(fullValue);

    // Auto-advance to next input if digit entered
    if (char) {
      const nextIdx = getNextOtpIndex(index, 'input', char, length);
      if (nextIdx !== index) {
        inputsRef.current[nextIdx]?.focus();
      }
      if (fullValue.length === length && onComplete) {
        onComplete(fullValue);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const prevIdx = getNextOtpIndex(index, 'backspace', '', length);
        inputsRef.current[prevIdx]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const parsed = parseOtpPaste(pasteData, length);

    if (onChange) onChange(parsed.value);

    // Focus the box matching the pasted length or the last box
    const focusTarget = parsed.isComplete ? length - 1 : parsed.nextIndex;
    inputsRef.current[focusTarget]?.focus();

    if (parsed.isComplete && onComplete) {
      onComplete(parsed.value);
    }
  };

  return (
    <div
      className="otp-container"
      onPaste={handlePaste}
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx] || ''}
          onChange={(e) => handleDigitChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          className={`otp-box ${error ? 'otp-box-error' : ''}`}
          aria-label={`Digit ${idx + 1} of ${length}`}
          autoComplete="one-time-code"
          style={{
            borderColor: error ? '#EF4444' : undefined,
            backgroundColor: disabled ? '#F3F4F6' : undefined,
          }}
        />
      ))}
    </div>
  );
}
