import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CommentAttachment {
  id: string;
  comment_id: string;
  card_id: string;
  uploaded_by: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

export function validateAttachment(file: File): string | null {
  const type = (file.type || '').toLowerCase();
  const isAllowed =
    ALLOWED_ATTACHMENT_TYPES.includes(type) ||
    /\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name);
  if (!isAllowed) {
    return 'Tipo não permitido. Use PDF, JPG, PNG ou WEBP.';
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return 'Arquivo acima do limite de 10MB.';
  }
  return null;
}

/**
 * Carrega anexos vinculados aos comentários de um card.
 * Retorna um mapa { [comment_id]: CommentAttachment[] }.
 */
export function useCommentAttachments(cardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['comment-attachments', cardId],
    enabled: !!cardId,
    queryFn: async (): Promise<CommentAttachment[]> => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('comment_attachments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as CommentAttachment[];
    },
  });

  const byComment: Record<string, CommentAttachment[]> = {};
  attachments.forEach((a) => {
    (byComment[a.comment_id] ||= []).push(a);
  });

  const uploadAttachments = useMutation({
    mutationFn: async ({
      commentId,
      cardId: cId,
      files,
    }: {
      commentId: string;
      cardId: string;
      files: File[];
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const inserted: CommentAttachment[] = [];
      for (const file of files) {
        const err = validateAttachment(file);
        if (err) throw new Error(`${file.name}: ${err}`);

        const safeName = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${cId}/${commentId}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from('comment-attachments')
          .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });
        if (upErr) throw upErr;

        const { data, error: insErr } = await supabase
          .from('comment_attachments')
          .insert({
            comment_id: commentId,
            card_id: cId,
            uploaded_by: user.id,
            file_name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            file_size: file.size,
          })
          .select('*')
          .single();
        if (insErr) throw insErr;
        inserted.push(data as CommentAttachment);
      }
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-attachments', cardId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao anexar arquivo',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (att: CommentAttachment) => {
      const { error: stErr } = await supabase.storage
        .from('comment-attachments')
        .remove([att.storage_path]);
      if (stErr) console.warn('[comment_attachments] storage remove falhou:', stErr.message);
      const { error } = await supabase
        .from('comment_attachments')
        .delete()
        .eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-attachments', cardId] });
    },
    onError: (err: any) => {
      toast({
        title: 'Erro ao remover anexo',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return { attachments, byComment, isLoading, uploadAttachments, deleteAttachment };
}

/** Gera URL assinada (1 hora) para visualização/download. */
export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('comment-attachments')
    .createSignedUrl(storagePath, 3600);
  if (error) {
    console.warn('[comment_attachments] signed url falhou:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}