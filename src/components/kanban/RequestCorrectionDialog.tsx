import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  useCreateCorrectionRequest,
  SECTION_LABELS,
  type CorrectionSection,
} from '@/hooks/useCorrectionRequests';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  proposalLinkId: string;
  cardId: string | null;
}

const ALL_SECTIONS = Object.keys(SECTION_LABELS) as CorrectionSection[];

export function RequestCorrectionDialog({ open, onOpenChange, proposalLinkId, cardId }: Props) {
  const [sections, setSections] = useState<CorrectionSection[]>([]);
  const [message, setMessage] = useState('');
  const create = useCreateCorrectionRequest();

  const toggle = (s: CorrectionSection) => {
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const reset = () => {
    setSections([]);
    setMessage('');
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    if (sections.length === 0) return;
    await create.mutateAsync({
      proposalLinkId,
      cardId,
      sections,
      message,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar correção da proposta</DialogTitle>
          <DialogDescription>
            Indique ao cliente quais blocos precisam ser corrigidos. O mesmo link público
            será reutilizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Blocos a corrigir</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_SECTIONS.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 text-sm rounded-md border p-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={sections.includes(s)}
                    onCheckedChange={() => toggle(s)}
                  />
                  <span>{SECTION_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Explique ao cliente o que precisa ser corrigido <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Ex.: Por favor, reenvie o comprovante de renda atualizado e corrija o e-mail informado."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || sections.length === 0 || create.isPending}
          >
            {create.isPending ? 'Enviando...' : 'Solicitar correção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}