import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useCommentMentions } from '@/hooks/useCommentMentions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
 import { MessageSquare, Send, Check, Eye, EyeOff, ArrowRightCircle, AtSign, Paperclip, X, UserCog, ArrowRight, RefreshCcw } from 'lucide-react';
 import { MessageCirclePlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { cn } from '@/lib/utils';
import { MentionTextarea, extractMentionedUserIds, renderMentionText } from './MentionTextarea';
import {
  useCommentAttachments,
  validateAttachment,
  formatFileSize,
} from '@/hooks/useCommentAttachments';
import { CommentAttachmentList } from './CommentAttachmentList';
import { useToast } from '@/hooks/use-toast';

const { useState } = React;

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

 import { useCardActivityLogs, CardActivityLog } from '@/hooks/useCardActivityLogs';
 import { History, Target, Calendar as CalendarIcon, ListChecks, RotateCcw, Sparkles } from 'lucide-react';

 type TimelineItem = 
   | { type: 'comment'; data: Comment }
   | { type: 'activity'; data: CardActivityLog };

interface CardNotesSidebarProps {
  cardId: string;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export const CardNotesSidebar = React.forwardRef<HTMLDivElement, CardNotesSidebarProps>(
  ({ cardId, showDetails = true, onToggleDetails }, ref) => {
  const { user, isEditor, roles } = useAuth();
  // Corretor (sem papel operacional) pode comentar com tipos restritos.
  const isCorretorOnly = !isEditor && roles.includes('corretor');
  const canComment = isEditor || isCorretorOnly;
  const { profiles } = useProfiles();
  const { cardMentions, createMentions, markMentionRead } = useCommentMentions(cardId);
  const { byComment, uploadAttachments, deleteAttachment } = useCommentAttachments(cardId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Ao abrir o card, marca como lidas as notificações deste card que pertencem ao usuário
  React.useEffect(() => {
    if (!user?.id || !cardId) return;
    (async () => {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('card_id', cardId)
          .eq('is_read', false);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (err) {
        console.warn('[CardNotesSidebar] mark notifications read falhou:', err);
      }
    })();
  }, [cardId, user?.id, queryClient]);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

   const { logs: activityLogs = [], isLoading: activityLoading } = useCardActivityLogs(cardId);
 
   // Merge comments and activity into unified timeline
   const timeline: TimelineItem[] = React.useMemo(() => {
     const items: TimelineItem[] = [];
     
     comments.forEach(c => items.push({ type: 'comment', data: c }));
     activityLogs.forEach(log => items.push({ type: 'activity', data: log }));
 
     items.sort((a, b) => {
       const dateA = a.type === 'comment' ? a.data.created_at : (a.type === 'activity' ? a.data.created_at : '');
       const dateB = b.type === 'comment' ? b.data.created_at : (b.type === 'activity' ? b.data.created_at : '');
       return new Date(dateB).getTime() - new Date(dateA).getTime();
     });
 
     return items;
   }, [comments, activityLogs]);

   const EVENT_META: Record<string, { icon: typeof History; color: string; bg: string }> = {
     card_created: { icon: Sparkles, color: 'text-emerald-700', bg: 'bg-emerald-100' },
     column_changed: { icon: ArrowRight, color: 'text-blue-700', bg: 'bg-blue-100' },
     responsible_changed: { icon: UserCog, color: 'text-violet-700', bg: 'bg-violet-100' },
     next_action_changed: { icon: Target, color: 'text-orange-700', bg: 'bg-orange-100' },
     due_date_changed: { icon: CalendarIcon, color: 'text-amber-700', bg: 'bg-amber-100' },
     checklist_created: { icon: ListChecks, color: 'text-teal-700', bg: 'bg-teal-100' },
     checklist_item_completed: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-100' },
     checklist_item_reopened: { icon: RotateCcw, color: 'text-slate-700', bg: 'bg-slate-100' },
   };

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({ card_id: cardId, content, user_id: user?.id })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, content) => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      if (data) {
        const mentionedIds = extractMentionedUserIds(content, profiles);
        if (mentionedIds.length > 0) {
          createMentions.mutate({ commentId: data.id, cardId, mentionedUserIds: mentionedIds });
        }
        if (pendingFiles.length > 0) {
          try {
            await uploadAttachments.mutateAsync({
              commentId: data.id,
              cardId,
              files: pendingFiles,
            });
          } catch {
            /* toast já mostrado pelo hook */
          }
          setPendingFiles([]);
        }
      }
      setNewNote('');
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from('comments').update({ content }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      setEditingId(null);
      setEditContent('');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
    },
  });

  const handleSubmit = () => {
    if (!newNote.trim() && pendingFiles.length === 0) return;
    // Garante que há texto mínimo (sistema usa content NOT NULL)
    if (!newNote.trim() && pendingFiles.length > 0) {
      addComment.mutate(`📎 ${pendingFiles.length} anexo(s)`);
      return;
    }
    addComment.mutate(newNote.trim());
  };

  const handlePickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles: File[] = [];
    for (const f of files) {
      const err = validateAttachment(f);
      if (err) {
        toast({
          title: 'Arquivo ignorado',
          description: `${f.name}: ${err}`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateComment.mutate({ id: editingId, content: editContent.trim() });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(part => part.charAt(0).toUpperCase()).slice(0, 2).join('');
  };

  const isLoading = commentsLoading || activityLoading;

  return (
    <div ref={ref} className="flex flex-col h-full w-full min-w-0 max-w-full overflow-hidden bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comentários e atividade</span>
        </div>
        {onToggleDetails && (
          <Button variant="outline" size="sm" onClick={onToggleDetails} className="text-xs h-7">
            {showDetails ? (
              <><EyeOff className="h-3 w-3 mr-1" />Ocultar Detalhes</>
            ) : (
              <><Eye className="h-3 w-3 mr-1" />Mostrar Detalhes</>
            )}
          </Button>
        )}
      </div>

      {/* Add new note */}
      {canComment && (
        <div className="p-3 border-b bg-background min-w-0 max-w-full">
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2 mb-2 min-w-0 no-scrollbar">
            {isEditor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setNewNote(prev => prev ? prev + '\n📋 Atualização: ' : '📋 Atualização: ')}
                >
                  <MessageCirclePlus className="h-3 w-3 mr-1" />
                  Atualização
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setNewNote(prev => prev ? prev + '\n⚠️ Pendência: ' : '⚠️ Pendência: ')}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pendência
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setNewNote(prev => prev ? prev + '\n✅ Conclusão: ' : '✅ Conclusão: ')}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conclusão
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setNewNote(prev => prev ? prev + '\n📝 Observação: ' : '📝 Observação: ')}
            >
              <MessageCirclePlus className="h-3 w-3 mr-1" />
              Observação
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setNewNote(prev => prev ? prev + '\n💬 Resumo da negociação: ' : '💬 Resumo da negociação: ')}
            >
              <MessageCirclePlus className="h-3 w-3 mr-1" />
              Resumo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setNewNote(prev => prev ? prev + '\n🔄 Movimentação: ' : '🔄 Movimentação: ')}
            >
              <RefreshCcw className="h-3 w-3 mr-1" />
              Movimentação
            </Button>
          </div>
          <MentionTextarea
            value={newNote}
            onChange={setNewNote}
            onSubmit={handleSubmit}
            placeholder={
              isCorretorOnly
                ? 'Registrar observação ou resumo da negociação...'
                : 'Escrever um comentário... Use @ para mencionar'
            }
          />

          {/* Anexos pendentes */}
          {pendingFiles.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {pendingFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-xs"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingFile(i)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={handlePickFiles}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => fileInputRef.current?.click()}
                title="Anexar PDF, JPG, PNG ou WEBP (máx. 10MB)"
              >
                <Paperclip className="h-3 w-3 mr-1" />
                Anexar
              </Button>
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                PDF/JPG/PNG/WEBP · 10MB
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                (!newNote.trim() && pendingFiles.length === 0) ||
                addComment.isPending ||
                uploadAttachments.isPending
              }
              size="sm"
              className="h-7 px-3"
            >
              <Send className="h-3 w-3 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Unified Timeline - Usando div nativa para evitar problemas de largura do ScrollArea */}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-3 space-y-4 min-w-0 max-w-full">
          {isLoading ? (
            <p className="text-xs text-muted-foreground p-2">Carregando...</p>
          ) : timeline.length === 0 ? (
            <p className="text-xs text-muted-foreground italic p-2">
              Nenhum comentário ou atividade ainda.
            </p>
          ) : (
            timeline.map((item) => {
              if (item.type === 'activity') {
                return (
                  <div key={`activity-${item.data.id}`} className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs border-l-2 border-blue-400 dark:border-blue-600 w-full min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-start gap-2">
                       {(() => {
                         const log = item.data;
                         const meta = EVENT_META[log.event_type] || {
                           icon: History,
                           color: 'text-muted-foreground',
                           bg: 'bg-muted',
                         };
                         const Icon = meta.icon;
                         const userName = log.actor_profile?.full_name || 'Usuário';
                         return (
                           <>
                             <Avatar className="h-6 w-6 flex-shrink-0">
                               <AvatarImage src={log.actor_profile?.avatar_url || undefined} alt={userName} />
                               <AvatarFallback className="text-[10px] bg-primary/10">
                                 {getInitials(userName)}
                               </AvatarFallback>
                             </Avatar>
                             <div className="flex-1 min-w-0">
                                 <div className="flex flex-col gap-1 min-w-0">
                                 <div className={cn("flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center", meta.bg, meta.color)}>
                                   <Icon className="h-2.5 w-2.5" />
                                 </div>
                                   <p className="text-foreground leading-tight font-medium min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                                   {log.title}
                                 </p>
                               </div>
                               {log.description && (
                                  <p className="text-muted-foreground mt-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-relaxed opacity-90">
                                   {log.description}
                                 </p>
                               )}
                               <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                                 <span className="font-medium text-foreground/70">{userName}</span>
                                 <span>·</span>
                                 <time dateTime={log.created_at}>
                                   {format(new Date(log.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                 </time>
                               </div>
                             </div>
                           </>
                         );
                       })()}
                    </div>
                  </div>
                );
              }

              // Comment item
              const comment = item.data;
              const isOwner = user?.id === comment.user_id;
              const isEditing = editingId === comment.id;
              const wasEdited = comment.updated_at !== comment.created_at;

              return (
                <div key={comment.id} className="p-3 bg-background rounded-lg group text-sm border-l-2 border-primary/30 w-full min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-start gap-2 min-w-0">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} alt={comment.profile?.full_name} />
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {getInitials(comment.profile?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-x-2 gap-y-1 flex-wrap min-w-0">
                        <span className="font-semibold text-foreground truncate min-w-0">
                          {comment.profile?.full_name || 'Usuário'}
                        </span>
                        <a href="#" className="text-muted-foreground hover:underline shrink-0" onClick={(e) => e.preventDefault()}>
                          {format(new Date(comment.created_at), "dd 'de' MMM. yyyy, HH:mm", { locale: ptBR })}
                        </a>
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-1">
                          <MentionTextarea
                            value={editContent}
                            onChange={setEditContent}
                            onSubmit={handleSaveEdit}
                            className="text-xs"
                          />
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveEdit} disabled={!editContent.trim() || updateComment.isPending}>
                              <Check className="h-3 w-3 mr-1" />Salvar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleCancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-foreground/90 mt-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-relaxed">
                            {renderMentionText(comment.content, profiles).map((part, i) => 
                              part.type === 'mention' ? (
                                <span key={i} className="text-primary font-medium">{part.content}</span>
                              ) : (
                                <span key={i}>{part.content}</span>
                              )
                            )}
                          </p>
                          <CommentAttachmentList
                            attachments={byComment[comment.id] || []}
                            canDelete={isOwner}
                            onDelete={(att) => deleteAttachment.mutate(att)}
                          />
                          {(() => {
                            const mention = cardMentions.find(
                              m => m.comment_id === comment.id && m.mentioned_user_id === user?.id
                            );
                            if (!mention) return null;
                            return mention.is_read ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Check className="h-3 w-3" /> Lido
                              </span>
                            ) : (
                              <button
                                onClick={() => markMentionRead.mutate(mention.id)}
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5"
                              >
                                <AtSign className="h-3 w-3" /> Marcar como lido
                              </button>
                            );
                          })()}
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground flex-wrap">
                            {isOwner && (
                              <button onClick={() => handleStartEdit(comment)} className="hover:underline hover:text-foreground">
                                Editar
                              </button>
                            )}
                            {(isOwner || isEditor) && (
                              <button
                                onClick={() => { if (confirm('Excluir este comentário?')) deleteComment.mutate(comment.id); }}
                                className="hover:underline hover:text-destructive"
                              >
                                Excluir
                              </button>
                            )}
                            {wasEdited && <span className="text-muted-foreground">(editado)</span>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

CardNotesSidebar.displayName = 'CardNotesSidebar';
