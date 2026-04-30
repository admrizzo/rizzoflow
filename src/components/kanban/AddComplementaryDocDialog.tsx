import { useState, useMemo } from 'react';
import { Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { buildStandardDocName, sanitizeForFilename } from '@/lib/proposalDocNaming';

const DOC_TYPE_OPTIONS = [
  'Documento com foto',
  'Comprovante de residência',
  'Comprovante de renda',
  'Certidão de estado civil',
  'Matrícula do imóvel',
  'Documento do cônjuge',
  'Renda do cônjuge',
  'Contrato social',
  'Cartão CNPJ',
  'Procuração',
  'Declaração',
  'Outro',
];

interface AddComplementaryDocDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardId: string;
  ownerType: string;
  ownerLabel: string;
  ownerKey: string; // identificador estável p/ caminho
  personName: string;
  personRole: string;
  existingFinalNames: string[];
  partyId?: string | null;
}

export function AddComplementaryDocDialog({
  open,
  onOpenChange,
  cardId,
  ownerType,
  ownerLabel,
  ownerKey,
  personName,
  personRole,
  existingFinalNames,
  partyId,
}: AddComplementaryDocDialogProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [docType, setDocType] = useState<string>('');
  const [customType, setCustomType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveDocType = useMemo(() => {
    if (docType === 'Outro') return customType.trim();
    return docType;
  }, [docType, customType]);

  function reset() {
    setDocType('');
    setCustomType('');
    setFile(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }
    if (!effectiveDocType) {
      toast.error('Informe o tipo do documento');
      return;
    }
    setBusy(true);
    try {
      const standardized = buildStandardDocName({
        originalName: file.name,
        docType: effectiveDocType,
        personName,
        personRole,
        isComplementary: true,
        existingFinalNames,
      });
      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${cardId}/${ownerKey}/complementar/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('proposal-documents')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        console.error(upErr);
        toast.error('Falha ao enviar arquivo');
        return;
      }

      const categoryKey = sanitizeForFilename(effectiveDocType)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'complementar';

      // Resolve proposal_link_id do card para manter o vínculo correto do documento
      let proposalLinkId: string | null = null;
      try {
        const { data: cardRow } = await supabase
          .from('cards')
          .select('proposal_link_id')
          .eq('id', cardId)
          .maybeSingle();
        proposalLinkId = (cardRow as any)?.proposal_link_id || null;
      } catch (err) {
        console.warn('Não foi possível resolver proposal_link_id:', err);
      }

      const { error: insErr } = await supabase.from('proposal_documents').insert({
        card_id: cardId,
        proposal_link_id: proposalLinkId,
        party_id: partyId ?? null,
        category: categoryKey,
        category_label: effectiveDocType,
        owner_type: ownerType,
        owner_label: ownerLabel,
        file_name: standardized,
        original_file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        storage_path: path,
        is_complementary: true,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        console.error(insErr);
        toast.error('Falha ao registrar documento');
        return;
      }

      // Atividade automática
      await supabase.from('card_activity_logs').insert({
        card_id: cardId,
        actor_user_id: user?.id ?? null,
        event_type: 'complementary_document_added',
        title: `📎 Documento complementar adicionado: ${effectiveDocType} - ${personName}`,
        metadata: {
          owner_type: ownerType,
          owner_label: ownerLabel,
          file_name: standardized,
        },
      });

      toast.success('Documento complementar adicionado');
      qc.invalidateQueries({ queryKey: ['proposal-documents', cardId] });
      qc.invalidateQueries({ queryKey: ['card-activity-logs', cardId] });
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar documento complementar</DialogTitle>
          <DialogDescription>
            {ownerLabel} — o arquivo será nomeado automaticamente no padrão da proposta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo do documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {docType === 'Outro' && (
              <Input
                placeholder="Descreva o tipo do documento"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="text-xs text-muted-foreground">
                Selecionado: {file.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}