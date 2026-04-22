import { useProposalResponsibles } from '@/hooks/useProposalResponsibles';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCircle } from 'lucide-react';

interface ProposalResponsibleSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ProposalResponsibleSelect({ 
  value, 
  onChange, 
  disabled 
}: ProposalResponsibleSelectProps) {
  const { responsibles, isLoading } = useProposalResponsibles();

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <UserCircle className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">
          Responsável pela proposta <span className="text-destructive">*</span>
        </Label>
      </div>
      <Select
        value={value || ''}
        onValueChange={(v) => onChange(v || null)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={!value ? 'border-amber-400' : ''}>
          <SelectValue placeholder="Selecione um responsável" />
        </SelectTrigger>
        <SelectContent>
          {responsibles.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              Nenhum responsável cadastrado.
              <br />
              Configure na área de Administração.
            </div>
          ) : (
            responsibles.map((responsible) => (
              <SelectItem key={responsible.id} value={responsible.name}>
                {responsible.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {!value && (
        <p className="text-xs text-amber-600 mt-1">Campo obrigatório</p>
      )}
    </div>
  );
}
