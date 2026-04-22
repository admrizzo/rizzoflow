import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Trash2, Pencil, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface CardNotesSectionProps {
  cardId: string;
}

export function CardNotesSection({ cardId }: CardNotesSectionProps) {
  const { user, isEditor } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const pendingAdds = useRef<Set<string>>(new Set());

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for comments
      const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      return data.map(comment => ({
        ...comment,
        profile: profilesMap[comment.user_id || ''] || { full_name: 'Usuário' }
      })) as Comment[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('comments')
        .insert({
          card_id: cardId,
          content,
          user_id: user?.id
        });
      
      if (error) throw error;
    },
    onMutate: async (content) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', cardId] });
      
      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>(['comments', cardId]);
      
      // Create optimistic comment with temporary ID
      const tempId = `temp-${Date.now()}`;
      pendingAdds.current.add(tempId);
      
      const optimisticComment: Comment = {
        id: tempId,
        content,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          full_name: user?.user_metadata?.full_name || 'Você',
          avatar_url: undefined
        }
      };
      
      // Optimistically update to the new value
      queryClient.setQueryData<Comment[]>(['comments', cardId], (old) => {
        if (!old) return [optimisticComment];
        return [optimisticComment, ...old];
      });
      
      // Clear the input immediately for snappy feel
      setNewNote('');
      
      return { previousComments, tempId };
    },
    onError: (err, content, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', cardId], context.previousComments);
      }
      if (context?.tempId) {
        pendingAdds.current.delete(context.tempId);
      }
      // Restore the input value
      setNewNote(content);
      toast({
        title: 'Erro ao adicionar anotação',
        description: err.message,
        variant: 'destructive'
      });
    },
    onSettled: (data, error, variables, context) => {
      if (context?.tempId) {
        pendingAdds.current.delete(context.tempId);
      }
      // Sync with server quickly
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      }, 300);
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', cardId] });
      
      const previousComments = queryClient.getQueryData<Comment[]>(['comments', cardId]);
      
      // Optimistically update
      queryClient.setQueryData<Comment[]>(['comments', cardId], (old) => {
        if (!old) return old;
        return old.map(c => c.id === id ? { ...c, content, updated_at: new Date().toISOString() } : c);
      });
      
      // Close edit mode immediately
      setEditingId(null);
      setEditContent('');
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', cardId], context.previousComments);
      }
      toast({
        title: 'Erro ao atualizar anotação',
        description: err.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      }, 300);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['comments', cardId] });
      
      const previousComments = queryClient.getQueryData<Comment[]>(['comments', cardId]);
      
      // Optimistically remove
      queryClient.setQueryData<Comment[]>(['comments', cardId], (old) => {
        if (!old) return old;
        return old.filter(c => c.id !== commentId);
      });
      
      return { previousComments };
    },
    onError: (err, commentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', cardId], context.previousComments);
      }
      toast({
        title: 'Erro ao excluir anotação',
        description: err.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      }, 300);
    },
  });

  const handleSubmit = () => {
    if (!newNote.trim() || addComment.isPending) return;
    addComment.mutate(newNote.trim());
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim() || updateComment.isPending) return;
    updateComment.mutate({ id: editingId, content: editContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Anotações</span>
        <span className="text-xs text-muted-foreground">({comments.length})</span>
      </div>

      {/* Add new note */}
      {isEditor && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Escreva uma anotação..."
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1 hidden md:block">
              Shift+Enter para nova linha
            </p>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!newNote.trim() || addComment.isPending}
            size="icon"
            className="h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhuma anotação ainda.
          </p>
        ) : (
          comments.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            const isEditing = editingId === comment.id;
            const wasEdited = comment.updated_at !== comment.created_at;
            const isTemporary = comment.id.startsWith('temp-');

            return (
              <div 
                key={comment.id} 
                className={`flex gap-3 p-3 bg-muted/30 rounded-lg group ${isTemporary ? 'opacity-70' : ''}`}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {comment.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {comment.profile?.full_name || 'Usuário'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {isTemporary ? 'Enviando...' : (
                          <>
                            {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {wasEdited && ' (editado)'}
                          </>
                        )}
                      </span>
                      {!isEditing && !isTemporary && isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleStartEdit(comment)}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {!isEditing && !isTemporary && (isOwner || isEditor) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            if (confirm('Excluir esta anotação?')) {
                              deleteComment.mutate(comment.id);
                            }
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="mt-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="resize-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editContent.trim() || updateComment.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
