import { useEffect, useRef } from 'react';
import { cn } from './ui/utils';

interface CodeInputProps {
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  length?: number;
  onChange: (value: string, index: number) => void;
  onPaste?: (value: string) => void;
  value: string[];
}

export function CodeInput({
  autoFocus = false,
  className,
  disabled = false,
  length = 6,
  onChange,
  onPaste,
  value,
}: CodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }

    const firstEmptyIndex = value.findIndex((digit) => !digit);
    const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
    refs.current[targetIndex]?.focus();
  }, [autoFocus, disabled, length, value]);

  const focusInput = (index: number) => {
    if (index < 0 || index >= length) {
      return;
    }

    refs.current[index]?.focus();
    refs.current[index]?.select();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl border border-input bg-input-background text-center text-base outline-none transition',
            'focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50'
          )}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={(event) => {
            const input = event.target.value.replace(/\D/g, '').slice(0, 1);
            onChange(input, index);
            if (input) {
              focusInput(index + 1);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !value[index]) {
              event.preventDefault();
              if (index > 0) {
                onChange('', index - 1);
              }
              focusInput(index - 1);
              return;
            }

            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              focusInput(index - 1);
              return;
            }

            if (event.key === 'ArrowRight') {
              event.preventDefault();
              focusInput(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted || !onPaste) {
              return;
            }
            onPaste(pasted);
            const targetIndex = Math.min(pasted.length, length) - 1;
            focusInput(targetIndex < 0 ? 0 : targetIndex);
          }}
          onFocus={(event) => event.target.select()}
          type="text"
          value={value[index] || ''}
        />
      ))}
    </div>
  );
}
