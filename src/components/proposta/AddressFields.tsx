import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { useCepLookup } from '@/hooks/useCepLookup';
import { formatCep } from '@/lib/cep';

export interface AddressValue {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface AddressFieldsProps {
  value: AddressValue;
  onChange: (patch: Partial<AddressValue>) => void;
  required?: boolean;
  inputHeightClass?: string;
  /** Quando true, mostra asterisco em CEP/Logradouro/Bairro/Cidade/UF. Número também. */
  markRequired?: boolean;
}

/**
 * Bloco de endereço reutilizável com:
 * - máscara de CEP (00000-000)
 * - busca automática via ViaCEP (fallback BrasilAPI) quando atinge 8 dígitos
 * - preenchimento de logradouro/bairro/cidade/UF
 * - número e complemento sempre manuais
 * - mensagem amigável de loading/erro
 */
export function AddressFields({ value, onChange, inputHeightClass, markRequired }: AddressFieldsProps) {
  const h = inputHeightClass || 'mt-1.5';
  const req = markRequired ? <span className="text-destructive">*</span> : null;

  const { isLoading, notFound, error } = useCepLookup(value.cep, (res) => {
    // Sobrescreve apenas campos vindos do CEP; preserva número/complemento.
    onChange({
      cep: res.cep,
      logradouro: res.logradouro || value.logradouro,
      bairro: res.bairro || value.bairro,
      cidade: res.cidade || value.cidade,
      uf: res.uf || value.uf,
    });
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">CEP {req}</Label>
          <Input
            value={formatCep(value.cep)}
            inputMode="numeric"
            onChange={e => onChange({ cep: formatCep(e.target.value) })}
            placeholder="00000-000"
            className={h}
            maxLength={9}
          />
          {isLoading && (
            <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando endereço...
            </p>
          )}
          {(notFound || error) && (
            <p className="mt-1 text-xs text-amber-600 inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {notFound ? 'CEP não encontrado. Preencha o endereço manualmente.' : 'Não foi possível consultar o CEP. Preencha manualmente.'}
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium">Logradouro {req}</Label>
          <Input
            value={value.logradouro}
            onChange={e => onChange({ logradouro: e.target.value })}
            placeholder="Rua, Av..."
            className={h}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Número {req}</Label>
          <Input
            value={value.numero}
            onChange={e => onChange({ numero: e.target.value })}
            placeholder="Nº"
            className={h}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Complemento</Label>
          <Input
            value={value.complemento}
            onChange={e => onChange({ complemento: e.target.value })}
            placeholder="Apto, sala..."
            className={h}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Bairro {req}</Label>
          <Input
            value={value.bairro}
            onChange={e => onChange({ bairro: e.target.value })}
            placeholder="Bairro"
            className={h}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Cidade {req}</Label>
          <Input
            value={value.cidade}
            onChange={e => onChange({ cidade: e.target.value })}
            placeholder="Cidade"
            className={h}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label className="text-sm font-medium">UF {req}</Label>
          <Input
            value={value.uf}
            onChange={e => onChange({ uf: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="UF"
            className={h}
            maxLength={2}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}