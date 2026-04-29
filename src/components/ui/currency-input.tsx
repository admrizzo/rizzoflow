import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'onBlur' | 'type'> {
  value: string;
  onValueChange: (raw: string) => void;
  onBlurSave?: () => void;
}

/**
 * Converte um valor "raw" (string com número em formato JS, ex: "1234.5")
 * em centavos (inteiro). Aceita também strings já em formato BR ("1.234,50").
 */
function rawToCents(raw: string): number {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  // Detecta formato BR (vírgula como decimal)
  let normalized = s;
  if (s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(normalized);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/** Formata centavos como "1.234,56" (sem prefixo R$). */
function centsToDisplay(cents: number): string {
  const safe = Math.max(0, Math.floor(cents));
  const reais = Math.floor(safe / 100);
  const cs = safe % 100;
  const reaisStr = reais.toLocaleString('pt-BR');
  return `${reaisStr},${cs.toString().padStart(2, '0')}`;
}

/** Converte centavos para o "raw" que o pai espera (ex: "1234.56" ou ""). */
function centsToRaw(cents: number): string {
  if (cents <= 0) return '';
  return (cents / 100).toFixed(2);
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onBlurSave, className, placeholder, ...props }, ref) => {
    const [cents, setCents] = React.useState<number>(() => rawToCents(value));
    const [touched, setTouched] = React.useState(false);

    // Sincroniza com o valor vindo do pai (ex: carregar do servidor)
    React.useEffect(() => {
      const incoming = rawToCents(value);
      if (incoming !== cents) {
        setCents(incoming);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const updateCents = (next: number) => {
      setCents(next);
      onValueChange(centsToRaw(next));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Mantém apenas dígitos — comportamento "caixa registradora"
      const onlyDigits = e.target.value.replace(/\D/g, '');
      if (!onlyDigits) {
        updateCents(0);
        setTouched(true);
        return;
      }
      // Limita a 12 dígitos (até R$ 9.999.999.999,99) para evitar overflow visual
      const limited = onlyDigits.slice(0, 12);
      const next = parseInt(limited, 10);
      updateCents(isNaN(next) ? 0 : next);
      setTouched(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Atalho: ESC limpa o campo
      if (e.key === 'Escape') {
        updateCents(0);
        setTouched(true);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Coloca o cursor no fim — input "preenche da direita"
      const len = e.target.value.length;
      requestAnimationFrame(() => {
        try {
          e.target.setSelectionRange(len, len);
        } catch {
          /* noop */
        }
      });
    };

    const handleBlur = () => {
      onBlurSave?.();
    };

    const display = cents > 0 || touched ? centsToDisplay(cents) : '';

    return (
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none"
        >
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? '0,00'}
          className={cn('pl-9 text-right tabular-nums', className)}
          {...props}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
