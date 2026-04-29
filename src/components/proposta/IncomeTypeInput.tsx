import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCOME_TYPE_OPTIONS, detectIncomeTypeOption } from '@/lib/proposalMasks';

interface Props {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  label?: string;
  className?: string;
  inputSize?: 'sm' | 'md';
}

/**
 * Seleciona o TIPO/ORIGEM da renda (diferente de profissão).
 * Compatível com valores antigos (ex.: "Empregado(a)") via detectIncomeTypeOption.
 * Quando "Outro" é selecionado, exibe campo texto obrigatório.
 */
export function IncomeTypeInput({
  value,
  onChange,
  required,
  label = 'Tipo de renda',
  className,
  inputSize = 'md',
}: Props) {
  const initial = useMemo(() => detectIncomeTypeOption(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [option, setOption] = useState<string>(initial || '');
  const [outroText, setOutroText] = useState<string>(initial === 'Outro' ? value : '');

  useEffect(() => {
    const detected = detectIncomeTypeOption(value);
    if (detected && detected !== option) {
      setOption(detected);
      if (detected === 'Outro') setOutroText(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (next: string) => {
    setOption(next);
    if (next === 'Outro') onChange(outroText || '');
    else onChange(next);
  };

  const handleOutroChange = (txt: string) => {
    setOutroText(txt);
    onChange(txt);
  };

  const triggerCls = inputSize === 'sm' ? 'mt-1 h-9' : 'mt-1.5 h-10';
  const inputCls = inputSize === 'sm' ? 'mt-1 h-9' : 'mt-1.5';

  return (
    <div className={className}>
      <Label className={inputSize === 'sm' ? 'text-xs' : 'text-sm font-medium'}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={option || undefined} onValueChange={handleSelect}>
        <SelectTrigger className={triggerCls}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {INCOME_TYPE_OPTIONS.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {option === 'Outro' && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">
            Informe o tipo de renda {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            value={outroText}
            onChange={e => handleOutroChange(e.target.value)}
            placeholder="Ex.: Pró-labore, freelancer, comissões..."
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}