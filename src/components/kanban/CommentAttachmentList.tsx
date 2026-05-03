import { useState } from 'react';
import {
  CommentAttachment,
  formatFileSize,
  getAttachmentSignedUrl,
} from '@/hooks/useCommentAttachments';
import { Button } from '@/components/ui/button';
import { Download, Eye, FileText, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CommentAttachmentListProps {
  attachments: CommentAttachment[];
  canDelete?: boolean;
  onDelete?: (att: CommentAttachment) => void;
}

/**
 * Lista compacta de anexos do comentário, com ações Visualizar / Baixar.
 * Visualizar: PDF/imagem abrem em modal interno; outros tipos abrem em nova aba.
 */
export function CommentAttachmentList({
  attachments,
  canDelete,
  onDelete,
}: CommentAttachmentListProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    mime: string | null;
  } | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const isImage = (m: string | null) => !!m && m.startsWith('image/');
  const isPdf = (m: string | null, name: string) =>
    m === 'application/pdf' || /\.pdf$/i.test(name);

  const handleView = async (att: CommentAttachment) => {
    setLoadingId(att.id);
    try {
      const url = await getAttachmentSignedUrl(att.storage_path);
      if (!url) throw new Error('Não foi possível gerar URL.');
      if (isPdf(att.mime_type, att.file_name) || isImage(att.mime_type)) {
        setPreview({ name: att.file_name, url, mime: att.mime_type });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao abrir anexo',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDownload = async (att: CommentAttachment) => {
    setLoadingId(att.id);
    try {
      const url = await getAttachmentSignedUrl(att.storage_path);
      if (!url) throw new Error('Não foi possível gerar URL.');
      // Força download via blob para preservar o nome do arquivo
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err: any) {
      toast({
        title: 'Erro ao baixar anexo',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {attachments.map((att) => {
        const Icon = isImage(att.mime_type) ? ImageIcon : FileText;
        const isLoading = loadingId === att.id;
        return (
          <div
            key={att.id}
             className="flex flex-col sm:flex-row sm:items-center gap-2 px-2 py-2 rounded-md border bg-muted/40 text-xs min-w-0"
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
             <div className="flex items-center gap-2 min-w-0 flex-1">
               <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
               <div className="flex-1 min-w-0">
                 <div className="truncate font-medium text-foreground" title={att.file_name}>{att.file_name}</div>
                 {att.file_size != null && (
                   <div className="text-[10px] text-muted-foreground">
                     {formatFileSize(att.file_size)}
                   </div>
                 )}
               </div>
             </div>
              <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto ml-auto">
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="h-7 px-2 text-xs"
                 onClick={() => handleView(att)}
                 disabled={isLoading}
                 title="Visualizar"
               >
                 {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                 <span className="hidden sm:inline ml-1">Visualizar</span>
               </Button>
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="h-7 px-2 text-xs"
                 onClick={() => handleDownload(att)}
                 disabled={isLoading}
                 title="Baixar"
               >
                 <Download className="h-3 w-3" />
                 <span className="hidden sm:inline ml-1">Baixar</span>
               </Button>
             </div>
            {canDelete && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(`Remover anexo "${att.file_name}"?`)) onDelete(att);
                }}
                title="Remover anexo"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-sm truncate">{preview?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30">
            {preview && (preview.mime?.startsWith('image/') ? (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={preview.url}
                title={preview.name}
                className="w-full h-full border-0 bg-white"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}