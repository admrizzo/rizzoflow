import { useState } from 'react';
import { FileText, Download, Eye, Loader2, FileImage, FileType, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useProposalDocuments,
  OWNER_TYPE_ORDER,
  OWNER_TYPE_LABELS,
  type ProposalDocument,
} from '@/hooks/useProposalDocuments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AddComplementaryDocDialog } from './AddComplementaryDocDialog';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { usePermissions } from '@/hooks/usePermissions';

interface ProposalDocumentsSectionProps {
  cardId: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileIcon(mime: string | null) {
  if (!mime) return <FileText className="h-4 w-4" />;
  if (mime.startsWith('image/')) return <FileImage className="h-4 w-4" />;
  if (mime.includes('pdf')) return <FileType className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function ProposalDocumentsSection({ cardId }: ProposalDocumentsSectionProps) {
  const { data: docs = [], isLoading } = useProposalDocuments(cardId);
  // Carrega as partes (proposal_parties) ligadas ao card para conseguir agrupar
  // documentos por pessoa (party_id) com nome/papel corretos.
  const { data: parties = [] } = useQuery({
    queryKey: ['proposal-parties', cardId],
    enabled: !!cardId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: cardRow } = await supabase
        .from('cards')
        .select('id, proposal_link_id')
        .eq('id', cardId)
        .maybeSingle();
      const proposalLinkId = cardRow?.proposal_link_id || null;
      if (!proposalLinkId) return [] as Array<any>;
      const { data, error } = await supabase
        .from('proposal_parties' as any)
        .select('id, role, name, position, metadata, related_party_id')
        .eq('proposal_link_id', proposalLinkId)
        .order('position', { ascending: true });
      if (error) {
        console.error('Erro ao carregar partes da proposta:', error);
        return [] as Array<any>;
      }
      return (data as any[]) || [];
    },
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const { isAdmin, isGestor, isAdministrativo } = usePermissions();
  const canAddComplementary = isAdmin || isGestor || isAdministrativo;
  const [addCtx, setAddCtx] = useState<null | {
    ownerType: string;
    ownerLabel: string;
    ownerKey: string;
    personName: string;
    personRole: string;
  }>(null);
  const [previewDoc, setPreviewDoc] = useState<ProposalDocument | null>(null);

  async function handleOpen(
    doc: ProposalDocument,
    mode: 'view' | 'download',
    e?: React.MouseEvent,
  ) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mode === 'view') {
      // Abre modal interno — usa storage.download (autenticado) +
      // blob: URL local. Evita ERR_BLOCKED_BY_CLIENT em adblockers
      // que bloqueiam o domínio supabase.co.
      setPreviewDoc(doc);
      return;
    }
    // Download via storage.download → blob (não navega para supabase.co)
    setBusyId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('proposal-documents')
        .download(doc.storage_path);
      if (error || !data) {
        console.error(error);
        toast.error('Não foi possível baixar o arquivo');
        return;
      }
      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.file_name;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
      </div>
    );
  }

  const existingFinalNames = docs.map((d) => d.file_name);

  if (docs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
        Nenhum documento anexado.
      </div>
    );
  }

  // ── Agrupa por pessoa ──
  // Estratégia:
  //  1) Se o documento tem party_id válido → agrupa pela parte (proposal_parties).
  //  2) Senão (compatibilidade) → agrupa por owner_type + owner_label como antes.
  //
  // Mapeia role → ownerType visual (mantém os agrupamentos do header existente).
  const ROLE_TO_OWNER_TYPE: Record<string, string> = {
    primary_tenant: 'proponente',
    additional_tenant: 'proponente',
    tenant_spouse: 'conjuge',
    company: 'empresa',
    legal_representative: 'representante',
    guarantor: 'fiador',
    guarantor_spouse: 'conjuge',
  };
  const ROLE_LABEL: Record<string, string> = {
    primary_tenant: 'Locatário principal',
    additional_tenant: 'Locatário adicional',
    tenant_spouse: 'Cônjuge do locatário',
    company: 'Empresa',
    legal_representative: 'Representante legal',
    guarantor: 'Fiador',
    guarantor_spouse: 'Cônjuge do fiador',
  };

  const partyById = new Map<string, any>();
  for (const p of parties) partyById.set(p.id, p);

  // ── Nova estrutura aninhada ──
  // ownerType → personGroups[] (cada person tem docs próprios + spouseChild opcional)
  type PersonBlock = {
    key: string;
    label: string;
    personName: string;
    personRole: string;
    docs: ProposalDocument[];
    spouse?: PersonBlock; // bloco do cônjuge aninhado
  };

  // Helpers para identificar role do cônjuge
  const isSpouseRole = (role: string) =>
    role === 'tenant_spouse' || role === 'guarantor_spouse';

  // Constrói label/role para uma party
  const buildPersonBlock = (party: any): PersonBlock => {
    const role = party.role as string;
    const roleLabel = ROLE_LABEL[role] || role;
    const personName = party.name || roleLabel;
    let label = `${roleLabel} — ${personName}`;
    if (role === 'additional_tenant' && party.metadata?.tenant_index) {
      label = `${roleLabel} ${party.metadata.tenant_index} — ${personName}`;
    } else if (role === 'guarantor' && party.metadata?.guarantor_index) {
      label = `${roleLabel} ${party.metadata.guarantor_index} — ${personName}`;
    } else if (role === 'tenant_spouse' || role === 'guarantor_spouse') {
      label = `Cônjuge — ${personName}`;
    }
    let personRole = 'OUTROS';
    if (role === 'primary_tenant') personRole = 'TITULAR';
    else if (role === 'additional_tenant') personRole = 'LOCATARIO ADICIONAL';
    else if (role === 'company') personRole = 'EMPRESA';
    else if (role === 'legal_representative') personRole = 'REPRESENTANTE';
    else if (role === 'guarantor') personRole = 'FIADOR';
    else if (role === 'tenant_spouse' || role === 'guarantor_spouse') personRole = 'CONJUGE';
    return { key: party.id, label, personName, personRole, docs: [] };
  };

  // Distribui docs em blocos por party_id
  const blocksByPartyId = new Map<string, PersonBlock>();
  for (const p of parties) blocksByPartyId.set(p.id, buildPersonBlock(p));

  // ownerType → blocks (apenas pessoas "raiz" — não-cônjuges; cônjuges ficam aninhados)
  const groupedByOwnerType = new Map<string, PersonBlock[]>();
  for (const p of parties) {
    if (isSpouseRole(p.role)) continue; // será aninhado
    const ownerType = ROLE_TO_OWNER_TYPE[p.role] || 'outros';
    const block = blocksByPartyId.get(p.id)!;
    if (!groupedByOwnerType.has(ownerType)) groupedByOwnerType.set(ownerType, []);
    groupedByOwnerType.get(ownerType)!.push(block);
  }

  // Aninha cônjuges sob o titular/fiador via related_party_id (com fallback metadata.spouse_of)
  for (const p of parties) {
    if (!isSpouseRole(p.role)) continue;
    let parentId: string | null = p.related_party_id || null;
    // Fallback: tenta resolver pelo metadata.spouse_of
    if (!parentId && p.metadata?.spouse_of) {
      const so = String(p.metadata.spouse_of);
      if (so === 'primary_tenant') {
        const parent = parties.find((x: any) => x.role === 'primary_tenant');
        parentId = parent?.id || null;
      } else if (so.startsWith('additional_tenant_')) {
        const idx = Number(so.replace('additional_tenant_', '')) - 1;
        const parent = parties.find((x: any) => x.role === 'additional_tenant' && (x.metadata?.tenant_index ?? 0) === idx + 1);
        parentId = parent?.id || null;
      } else if (so.startsWith('guarantor_')) {
        const idx = Number(so.replace('guarantor_', '')) - 1;
        const parent = parties.find((x: any) => x.role === 'guarantor' && (x.metadata?.guarantor_index ?? 0) === idx + 1);
        parentId = parent?.id || null;
      }
    }
    const spouseBlock = blocksByPartyId.get(p.id)!;
    if (parentId && blocksByPartyId.has(parentId)) {
      blocksByPartyId.get(parentId)!.spouse = spouseBlock;
    } else {
      // Sem vínculo → cai em grupo "Cônjuges" (compatibilidade legado)
      const ownerType = 'conjuge';
      if (!groupedByOwnerType.has(ownerType)) groupedByOwnerType.set(ownerType, []);
      groupedByOwnerType.get(ownerType)!.push(spouseBlock);
    }
  }

  // Distribui docs nos blocos (com fallback legado para docs sem party_id)
  const legacyGrouped = new Map<string, Map<string, ProposalDocument[]>>();
  const ensureLegacy = (ownerType: string, ownerLabel: string) => {
    if (!legacyGrouped.has(ownerType)) legacyGrouped.set(ownerType, new Map());
    const inner = legacyGrouped.get(ownerType)!;
    if (!inner.has(ownerLabel)) inner.set(ownerLabel, []);
    return inner.get(ownerLabel)!;
  };
  for (const d of docs) {
    if (d.party_id && blocksByPartyId.has(d.party_id)) {
      blocksByPartyId.get(d.party_id)!.docs.push(d);
    } else {
      const ownerType = d.owner_type || 'outros';
      const ownerLabel = d.owner_label || OWNER_TYPE_LABELS[ownerType] || 'Outros';
      ensureLegacy(ownerType, ownerLabel).push(d);
    }
  }

  const sortedOwnerTypes = Array.from(groupedByOwnerType.keys()).sort((a, b) => {
    const ai = OWNER_TYPE_ORDER.indexOf(a as any);
    const bi = OWNER_TYPE_ORDER.indexOf(b as any);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const sortedLegacyOwnerTypes = Array.from(legacyGrouped.keys()).sort((a, b) => {
    const ai = OWNER_TYPE_ORDER.indexOf(a as any);
    const bi = OWNER_TYPE_ORDER.indexOf(b as any);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const renderDocRow = (doc: ProposalDocument) => (
    <div key={doc.id} className="flex items-center gap-3 rounded-md bg-background border p-2">
      <div className="text-muted-foreground">{fileIcon(doc.mime_type)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{doc.file_name}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] py-0 h-4">{doc.category_label}</Badge>
          {doc.is_complementary && (
            <Badge className="text-[10px] py-0 h-4 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Complementar</Badge>
          )}
          <span>{formatFileSize(doc.file_size)}</span>
          <span>•</span>
          <span>{format(new Date(doc.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" type="button" variant="ghost" disabled={busyId === doc.id}
          onClick={(e) => handleOpen(doc, 'view', e)} title="Visualizar">
          {busyId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button size="sm" type="button" variant="ghost" disabled={busyId === doc.id}
          onClick={(e) => handleOpen(doc, 'download', e)} title="Baixar">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderPersonBlock = (block: PersonBlock, ownerType: string, isNested = false) => (
    <div key={block.key} className={`rounded-md border bg-muted/30 p-3 space-y-2 ${isNested ? 'ml-6 border-l-2 border-l-primary/30' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">{block.label}</div>
        {canAddComplementary && (
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => setAddCtx({
              ownerType,
              ownerLabel: block.label,
              ownerKey: block.key,
              personName: block.personName,
              personRole: block.personRole,
            })}>
            <Plus className="h-3 w-3 mr-1" />
            Complementar
          </Button>
        )}
      </div>
      {block.docs.length === 0 && (
        <div className="text-xs text-muted-foreground italic">Nenhum documento.</div>
      )}
      {block.docs.map(renderDocRow)}
      {block.spouse && renderPersonBlock(block.spouse, 'conjuge', true)}
    </div>
  );

  return (
    <div className="space-y-4">
      {sortedOwnerTypes.map((ownerType) => {
        const blocks = groupedByOwnerType.get(ownerType)!;
        return (
          <div key={ownerType} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {OWNER_TYPE_LABELS[ownerType] || ownerType}
            </h4>
            {blocks.map((b) => renderPersonBlock(b, ownerType))}
          </div>
        );
      })}

      {/* Documentos legados (sem party_id) */}
      {sortedLegacyOwnerTypes.map((ownerType) => {
        const ownerGroups = legacyGrouped.get(ownerType)!;
        return (
          <div key={`legacy-${ownerType}`} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {OWNER_TYPE_LABELS[ownerType] || ownerType}
            </h4>
            {Array.from(ownerGroups.entries()).map(([ownerLabel, items]) => {
              const first = items[0];
              const ownerKey = ownerType === 'fiador'
                ? (first.storage_path.split('/')[1] || `fiador-1`)
                : ownerType;
              const isPj = ownerType === 'empresa';
              const personName = ownerLabel.replace(/^Fiador\s+\d+\s+—\s+/, '') || ownerLabel;
              const personRole = ownerType === 'fiador' ? 'FIADOR'
                : ownerType === 'conjuge' ? 'CONJUGE'
                : isPj ? 'EMPRESA' : 'TITULAR';
              return (
                <div key={ownerLabel} className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {ownerLabel !== (OWNER_TYPE_LABELS[ownerType] || '') ? (
                      <div className="text-xs font-medium text-muted-foreground">{ownerLabel}</div>
                    ) : <div />}
                    {canAddComplementary && (
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setAddCtx({ ownerType, ownerLabel, ownerKey, personName, personRole })}>
                        <Plus className="h-3 w-3 mr-1" />
                        Complementar
                      </Button>
                    )}
                  </div>
                  {items.map(renderDocRow)}
                </div>
              );
            })}
          </div>
        );
      })}
      {addCtx && (
        <AddComplementaryDocDialog
          open={!!addCtx}
          onOpenChange={(v) => { if (!v) setAddCtx(null); }}
          cardId={cardId}
          ownerType={addCtx.ownerType}
          ownerLabel={addCtx.ownerLabel}
          ownerKey={addCtx.ownerKey}
          personName={addCtx.personName}
          personRole={addCtx.personRole}
          existingFinalNames={existingFinalNames}
        />
      )}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={(v) => { if (!v) setPreviewDoc(null); }}
        storagePath={previewDoc?.storage_path ?? null}
        fileName={previewDoc?.file_name ?? ''}
        mimeType={previewDoc?.mime_type ?? null}
      />
    </div>
  );
}