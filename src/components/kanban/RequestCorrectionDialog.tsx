import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateCorrectionRequest } from '@/hooks/useCorrectionRequests';
import {
  STEP_LABELS, FIELD_CATALOG, PARTY_KIND_LABELS,
  type CorrectionStep, type CorrectionItem, type CorrectionPartyKind,
} from '@/lib/correctionCatalog';
import { useCardParties } from '@/hooks/useCardParties';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposalLinkId: string;
  cardId: string | null;
}

interface DraftItem {
  step: CorrectionStep | '';
  field: string;
  party_kind: CorrectionPartyKind | '';
  party_id: string | null;
  party_label: string | null;
  note: string;
}

const emptyItem = (): DraftItem => ({
  step: '', field: '', party_kind: '', party_id: null, party_label: null, note: '',
});

const STEP_OPTIONS = (Object.keys(STEP_LABELS) as CorrectionStep[]);

// Mapa: party_kind do catálogo → party_type usado em card_parties
const PARTY_KIND_TO_TYPES: Record<CorrectionPartyKind, string[]> = {
  locatario_principal: ['locatario'],
  locatario_adicional: ['locatario'],
  conjuge: ['locatario'],
  fiador: ['fiador'],
  conjuge_fiador: ['fiador'],
  empresa: ['locatario'],
  representante: ['locatario'],
  imovel: ['imovel', 'proprietario'],
};

export function RequestCorrectionDialog({ open, onOpenChange, proposalLinkId, cardId }: Props) {
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [message, setMessage] = useState('');
  const create = useCreateCorrectionRequest();
  const { parties: cardParties = [] } = useCardParties(cardId || undefined);

  const reset = () => { setItems([emptyItem()]); setMessage(''); };

  useEffect(() => { if (!open) reset(); }, [open]);

  const updateItem = (i: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const valid = useMemo(() => {
    if (!message.trim()) return false;
    if (items.length === 0) return false;
    return items.every((it) => it.step && it.field);
  }, [items, message]);

  const handleSubmit = async () => {
    if (!valid) return;
    const sections: CorrectionItem[] = items.map((it) => {
      const def = FIELD_CATALOG[it.step as CorrectionStep]?.find((f) => f.key === it.field);
      return {
        step: it.step as CorrectionStep,
        field: it.field,
        field_label: def?.label,
        party_kind: (it.party_kind || null) as any,
        party_id: it.party_id,
        party_label: it.party_label,
        action: def?.action || 'edit_field',
        note: it.note?.trim() || null,
      };
    });
    await create.mutateAsync({ proposalLinkId, cardId, sections, message });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar correção da proposta</DialogTitle>
          <DialogDescription>
            Indique exatamente o que precisa ser corrigido. O cliente abrirá o link
            e irá direto ao ponto solicitado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            {items.map((it, idx) => {
              const stepFields = it.step ? FIELD_CATALOG[it.step as CorrectionStep] : [];
              const fieldDef = stepFields?.find((f) => f.key === it.field);
              const allowedPartyKinds = fieldDef?.parties || [];
              // Sugestões de pessoas reais do card que se encaixam
              const suggestedParties = it.party_kind && cardParties.length > 0
                ? cardParties.filter((p) =>
                    PARTY_KIND_TO_TYPES[it.party_kind as CorrectionPartyKind]?.includes(p.party_type),
                  )
                : [];

              return (
                <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Item de correção #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Etapa</Label>
                      <Select
                        value={it.step || ''}
                        onValueChange={(v) => updateItem(idx, { step: v as CorrectionStep, field: '', party_kind: '', party_id: null, party_label: null })}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {STEP_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{STEP_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Campo / documento</Label>
                      <Select
                        value={it.field || ''}
                        onValueChange={(v) => updateItem(idx, { field: v, party_kind: '', party_id: null, party_label: null })}
                        disabled={!it.step}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {stepFields.map((f) => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {allowedPartyKinds.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Pessoa relacionada</Label>
                        <Select
                          value={it.party_kind || ''}
                          onValueChange={(v) => updateItem(idx, { party_kind: v as CorrectionPartyKind, party_id: null, party_label: PARTY_KIND_LABELS[v as CorrectionPartyKind] })}
                        >
                          <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {allowedPartyKinds.map((k) => (
                              <SelectItem key={k} value={k}>{PARTY_KIND_LABELS[k]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {suggestedParties.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Vincular a (opcional)</Label>
                          <Select
                            value={it.party_id || '__none'}
                            onValueChange={(v) => {
                              if (v === '__none') {
                                updateItem(idx, { party_id: null });
                              } else {
                                const p = suggestedParties.find((x) => x.id === v);
                                updateItem(idx, {
                                  party_id: v,
                                  party_label: p?.name || it.party_label,
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">— Nenhuma pessoa específica —</SelectItem>
                              {suggestedParties.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name || `${p.party_type} ${p.party_number}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Observação para este item (opcional)</Label>
                    <Textarea
                      value={it.note}
                      onChange={(e) => updateItem(idx, { note: e.target.value })}
                      rows={2}
                      placeholder="Ex.: Comprovante ilegível, reenviar versão atualizada."
                    />
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar outro item de correção
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Mensagem geral para o cliente <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Ex.: Olá! Identifiquei alguns ajustes necessários. Por favor, revise os itens acima e reenvie."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || create.isPending}>
            {create.isPending ? 'Enviando...' : 'Solicitar correção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
