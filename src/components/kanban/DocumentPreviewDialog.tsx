import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePath: string | null;
  fileName: string;
  mimeType: string | null;
}

/**
 * Modal de visualização interna de documentos.
 *
 * Em vez de navegar diretamente para a signed URL do Supabase
 * (o que pode ser bloqueado por adblockers / extensões com
 * `ERR_BLOCKED_BY_CLIENT`), baixa o arquivo via API do storage
 * e exibe a partir de um blob: URL local — que nenhum adblocker
 * consegue bloquear.
 */
export function DocumentPreviewDialog({
  open,
  onOpenChange,
  storagePath,
  fileName,
  mimeType,
}: DocumentPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedMime, setResolvedMime] = useState<string | null>(mimeType);

  useEffect(() => {
    let revoked = false;
    let currentBlobUrl: string | null = null;

    async function load() {
      if (!open || !storagePath) return;
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      try {
        // Usa storage.download → autenticado via SDK, sem expor URL pública.
        const { data, error: dlErr } = await supabase.storage
          .from('proposal-documents')
          .download(storagePath);
        if (dlErr || !data) {
          throw dlErr || new Error('Falha ao baixar arquivo');
        }
        const effectiveMime =
          mimeType ||
          data.type ||
          (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
        setResolvedMime(effectiveMime || null);
        const typedBlob =
          effectiveMime && data.type !== effectiveMime
            ? new Blob([data], { type: effectiveMime })
            : data;
        currentBlobUrl = URL.createObjectURL(typedBlob);
        if (!revoked) setBlobUrl(currentBlobUrl);
      } catch (e: any) {
        console.error('Preview error:', e);
        if (!revoked) {
          setError(
            'Não foi possível abrir a pré-visualização. Use o botão Baixar.',
          );
        }
      } finally {
        if (!revoked) setLoading(false);
      }
    }

    load();
    return () => {
      revoked = true;
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [open, storagePath, mimeType, fileName]);

  async function handleDownload() {
    if (!storagePath) return;
    try {
      const { data, error: dlErr } = await supabase.storage
        .from('proposal-documents')
        .download(storagePath);
      if (dlErr || !data) throw dlErr || new Error('Falha');
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao baixar o arquivo');
    }
  }

  function handleOpenNewTab() {
    if (!blobUrl) return;
    // blob: URLs não são bloqueadas por adblockers
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }

  const isPdf = resolvedMime?.includes('pdf');
  const isImage = resolvedMime?.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base truncate pr-8">{fileName}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização de documento
          </DialogDescription>
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
            {blobUrl && (
              <Button size="sm" variant="ghost" onClick={handleOpenNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/30 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando documento…
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div className="text-sm text-muted-foreground max-w-md">{error}</div>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar arquivo
              </Button>
            </div>
          )}
          {!loading && !error && blobUrl && (
            <>
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={fileName}
                  className="w-full h-full border-0"
                />
              )}
              {isImage && (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={blobUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {!isPdf && !isImage && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
                  <div className="text-sm text-muted-foreground max-w-md">
                    Este tipo de arquivo não pode ser pré-visualizado no navegador.
                  </div>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivo
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}