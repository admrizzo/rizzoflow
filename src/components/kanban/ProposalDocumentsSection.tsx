import { useState } from 'react';
import { FileText, Download, Eye, Loader2, FileImage, FileType } from 'lucide-react';
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
      const url = await getProposalDocumentSignedUrl(doc.storage_path);
      if (!url) {
        toast.error('Não foi possível abrir o arquivo');
        return;
      }
      if (mode === 'view') {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) win.opener = null;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            {Array.from(ownerGroups.entries()).map(([ownerLabel, items]) => (
              <div key={ownerLabel} className="rounded-md border bg-muted/30 p-3 space-y-2">
                {ownerLabel !== (OWNER_TYPE_LABELS[ownerType] || '') && (
                  <div className="text-xs font-medium text-muted-foreground">{ownerLabel}</div>
                )}
                {items.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-md bg-background border p-2">
                    <div className="text-muted-foreground">{fileIcon(doc.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{doc.file_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {doc.category_label}
                        </Badge>
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
            ))}
          </div>
        );
      })}
    </div>
  );
}