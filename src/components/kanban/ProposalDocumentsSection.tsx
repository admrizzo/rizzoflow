import { useState } from 'react';
import { FileText, Download, Eye, Loader2, FileImage, FileType, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useProposalDocuments,
  getProposalDocumentSignedUrl,
  OWNER_TYPE_ORDER,
  OWNER_TYPE_LABELS,
  type ProposalDocument,
} from '@/hooks/useProposalDocuments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AddComplementaryDocDialog } from './AddComplementaryDocDialog';
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

  async function handleOpen(
    doc: ProposalDocument,
    mode: 'view' | 'download',
    e?: React.MouseEvent,
  ) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBusyId(doc.id);
    try {
      if (mode === 'view') {
        const url = await getProposalDocumentSignedUrl(doc.storage_path);
        if (!url) {
          toast.error('Não foi possível abrir o arquivo');
          return;
        }
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) win.opener = null;
      } else {
        // Gera URL assinada com Content-Disposition: attachment
        const url = await getProposalDocumentSignedUrl(doc.storage_path, 600, {
          download: doc.file_name,
        });
        if (!url) {
          toast.error('Não foi possível baixar o arquivo');
          return;
        }
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('fetch failed');
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = doc.file_name;
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch {
          // Fallback: usa link direto com download attribute (sem nova aba)
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.file_name;
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
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

  // Agrupa: owner_type → owner_label → docs[]
  const grouped = new Map<string, Map<string, ProposalDocument[]>>();
  for (const d of docs) {
    const ownerType = d.owner_type || 'outros';
    const ownerLabel = d.owner_label || OWNER_TYPE_LABELS[ownerType] || 'Outros';
    if (!grouped.has(ownerType)) grouped.set(ownerType, new Map());
    const inner = grouped.get(ownerType)!;
    if (!inner.has(ownerLabel)) inner.set(ownerLabel, []);
    inner.get(ownerLabel)!.push(d);
  }

  // Ordena pelas chaves conhecidas
  const sortedOwnerTypes = Array.from(grouped.keys()).sort((a, b) => {
    const ai = OWNER_TYPE_ORDER.indexOf(a as any);
    const bi = OWNER_TYPE_ORDER.indexOf(b as any);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-4">
      {sortedOwnerTypes.map((ownerType) => {
        const ownerGroups = grouped.get(ownerType)!;
        return (
          <div key={ownerType} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              {OWNER_TYPE_LABELS[ownerType] || ownerType}
            </h4>
            {Array.from(ownerGroups.entries()).map(([ownerLabel, items]) => {
              // Deriva ownerKey/personName/role a partir do primeiro item do grupo
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
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setAddCtx({
                        ownerType,
                        ownerLabel,
                        ownerKey,
                        personName,
                        personRole,
                      })}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Complementar
                    </Button>
                  )}
                </div>
                {items.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-md bg-background border p-2">
                    <div className="text-muted-foreground">{fileIcon(doc.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{doc.file_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {doc.category_label}
                        </Badge>
                        {doc.is_complementary && (
                          <Badge className="text-[10px] py-0 h-4 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                            Complementar
                          </Badge>
                        )}
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(doc.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        disabled={busyId === doc.id}
                        onClick={(e) => handleOpen(doc, 'view', e)}
                        title="Visualizar"
                      >
                        {busyId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        disabled={busyId === doc.id}
                        onClick={(e) => handleOpen(doc, 'download', e)}
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
    </div>
  );
}