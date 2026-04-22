import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur' | 'type'> {
  value: string;
  onValueChange: (raw: string) => void;
  onBlurSave?: () => void;
}

function formatBRL(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(formatted: string): string {
  // Remove thousand separators (.) and replace decimal comma with dot
  const cleaned = formatted.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toString();
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onBlurSave, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState(() => formatBRL(value));

    // Sync from parent when not focused
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatBRL(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw number on focus for easy editing
      const num = parseFloat(value);
      if (!isNaN(num)) {
        setDisplayValue(num.toFixed(2).replace('.', ','));
      }
      // Select all on focus
      setTimeout(() => e.target.select(), 0);
    };

    const handleBlur = () => {
      setIsFocused(false);
      const raw = parseBRL(displayValue);
      onValueChange(raw);
      setDisplayValue(formatBRL(raw));
      onBlurSave?.();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow digits, comma, dot
      const val = e.target.value.replace(/[^\d,.]/g, '');
      setDisplayValue(val);
      // Update parent with raw value
      const raw = parseBRL(val);
      if (raw) onValueChange(raw);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
