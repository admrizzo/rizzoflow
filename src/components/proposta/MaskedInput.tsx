import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { maskCPF, maskPhone, isValidCPF, isValidPhone } from '@/lib/proposalMasks';

type MaskKind = 'cpf' | 'phone';

interface Props extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  kind: MaskKind;
  value: string;
  onValueChange: (next: string) => void;
  showError?: boolean;
  errorText?: string;
}

/**
 * Input com máscara em tempo real para CPF ou telefone.
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, Props>(
  ({ kind, value, onValueChange, className, showError, errorText, onBlur, ...rest }, ref) => {
    const [touched, setTouched] = React.useState(false);
    const formatted = kind === 'cpf' ? maskCPF(value || '') : maskPhone(value || '');
    const valid = kind === 'cpf' ? isValidCPF(value || '') : isValidPhone(value || '');
    const empty = !value || !value.trim();
    const shouldShowError = (showError || touched) && !empty && !valid;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = kind === 'cpf' ? maskCPF(e.target.value) : maskPhone(e.target.value);
      onValueChange(masked);
    };

    const defaultMsg = kind === 'cpf' ? 'CPF inválido' : 'Telefone inválido (use DDD + número)';

    return (
      <div>
        <Input
          ref={ref}
          type="text"
          inputMode={kind === 'cpf' ? 'numeric' : 'tel'}
          value={formatted}
          onChange={handleChange}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
          className={cn(shouldShowError && 'border-red-400 focus-visible:ring-red-400/40', className)}
          {...rest}
        />
        {shouldShowError && (
          <p className="mt-1 text-xs text-red-600">{errorText || defaultMsg}</p>
        )}
      </div>
    );
  },
);
MaskedInput.displayName = 'MaskedInput';