import { useState } from 'react';
import { MaintenanceProvider } from '@/hooks/useMaintenanceProviders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, CheckCircle2, X } from 'lucide-react';

const budgetStatusLabels: Record<string, string> = {
  pendente: 'Pendente',
  recebido: 'Recebido',
};

interface ProviderDetailPanelProps {
  provider: MaintenanceProvider;
  onUpdate: (updates: Partial<MaintenanceProvider>) => void;
  onRemove: () => void;
  onSelect: () => void;
  onClose: () => void;
  canEdit: boolean;
}

export function ProviderDetailPanel({ provider, onUpdate, onRemove, onSelect, onClose, canEdit }: ProviderDetailPanelProps) {
  const [localBudget, setLocalBudget] = useState(provider.budget_value?.toString() || '');
  const [localNotes, setLocalNotes] = useState(provider.notes || '');
  const [localPhone, setLocalPhone] = useState(provider.provider_phone || '');

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{provider.provider_name}</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Status do Orçamento</Label>
          <Select
            value={provider.budget_status}
          onValueChange={(v) => onUpdate({
              budget_status: v,
              budget_received_at: v === 'recebido' && !provider.budget_received_at ? new Date().toISOString() : provider.budget_received_at,
            })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(budgetStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Valor do Orçamento (R$)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            step="0.01"
            value={localBudget}
            onChange={(e) => setLocalBudget(e.target.value)}
            onBlur={() => {
              const val = localBudget ? parseFloat(localBudget) : null;
              if (val !== provider.budget_value) onUpdate({ budget_value: val });
            }}
            disabled={!canEdit}
            placeholder="0,00"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Telefone</Label>
        <Input
          className="h-8 text-xs"
          value={localPhone}
          onChange={(e) => setLocalPhone(e.target.value)}
          onBlur={() => {
            if (localPhone !== (provider.provider_phone || '')) onUpdate({ provider_phone: localPhone || null });
          }}
          disabled={!canEdit}
          placeholder="(31) 99999-0000"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Observações</Label>
        <Textarea
          className="text-xs"
          rows={2}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => {
            if (localNotes !== (provider.notes || '')) onUpdate({ notes: localNotes || null });
          }}
          disabled={!canEdit}
        />
      </div>

      {canEdit && (
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onSelect}
          >
            <CheckCircle2 className="h-3 w-3" />
            Selecionar prestador
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </Button>
        </div>
      )}
    </div>
  );
}
