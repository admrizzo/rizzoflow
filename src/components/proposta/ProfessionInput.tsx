import { useMemo, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROFESSION_OPTIONS, detectProfessionOption } from '@/lib/proposalMasks';

interface Props {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  label?: string;
  className?: string;
  inputSize?: 'sm' | 'md';
}

/**
 * Seleciona a profissão a partir de uma lista padronizada.
 * Se "Outro" for selecionado, exibe campo de texto obrigatório.
 * Compatível com valores antigos em texto livre: se o valor não bater
 * com a lista, é tratado como "Outro" e exibido no campo de texto.
 */
export function ProfessionInput({ value, onChange, required, label = 'Profissão', className, inputSize = 'md' }: Props) {
  const initialOption = useMemo(() => detectProfessionOption(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [option, setOption] = useState<string>(initialOption || '');
  const [outroText, setOutroText] = useState<string>(initialOption === 'Outro' ? value : '');

  // Sincroniza quando o valor externo muda (ex.: restauração de rascunho)
  useEffect(() => {
    const detected = detectProfessionOption(value);
    if (detected && detected !== option) {
      setOption(detected);
      if (detected === 'Outro') setOutroText(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (next: string) => {
    setOption(next);
    if (next === 'Outro') {
      onChange(outroText || '');
    } else {
      onChange(next);
    }
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
          {PROFESSION_OPTIONS.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {option === 'Outro' && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">
            Informe a profissão {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            value={outroText}
            onChange={e => handleOutroChange(e.target.value)}
            placeholder="Digite sua profissão"
            className={inputCls}
          />
        </div>
      )}
    </div>
  );
}