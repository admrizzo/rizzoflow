import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useCommentMentions } from '@/hooks/useCommentMentions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Check, Eye, EyeOff, ArrowRightCircle, AtSign } from 'lucide-react';
import { MessageCirclePlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MentionTextarea, extractMentionedUserIds, renderMentionText } from './MentionTextarea';

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

interface ActivityLog {
  id: string;
  card_id: string;
  user_id: string;
  from_column_id: string;
  to_column_id: string;
  created_at: string;
}

type TimelineItem = 
  | { type: 'comment'; data: Comment }
  | { type: 'activity'; data: ActivityLog; userName: string; avatarUrl?: string; fromColumnName: string; toColumnName: string };

interface CardNotesSidebarProps {
  cardId: string;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

export const CardNotesSidebar = React.forwardRef<HTMLDivElement, CardNotesSidebarProps>(
  ({ cardId, showDetails = true, onToggleDetails }, ref) => {
  const { user, isEditor } = useAuth();
  const { profiles } = useProfiles();
  const { cardMentions, createMentions, markMentionRead } = useCommentMentions(cardId);
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

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

  const { data: activityLogs = [], isLoading: activityLoading } = useQuery({
    queryKey: ['card_activity_log', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_activity_log')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ActivityLog[];
    },
  });

  // Build columns map for activity log display
  const { data: columnsMap = {} } = useQuery({
    queryKey: ['columns_map_for_activity', cardId],
    queryFn: async () => {
      const columnIds = new Set<string>();
      activityLogs.forEach(log => {
        if (log.from_column_id) columnIds.add(log.from_column_id);
        if (log.to_column_id) columnIds.add(log.to_column_id);
      });
      if (columnIds.size === 0) return {};
      const { data, error } = await supabase
        .from('columns')
        .select('id, name')
        .in('id', Array.from(columnIds));
      if (error) return {};
      return (data || []).reduce((acc, col) => {
        acc[col.id] = col.name;
        return acc;
      }, {} as Record<string, string>);
    },
    enabled: activityLogs.length > 0,
  });

  // Build profiles map for activity logs
  const activityProfilesMap = React.useMemo(() => {
    const map: Record<string, { full_name: string; avatar_url?: string }> = {};
    profiles.forEach(p => {
      map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url || undefined };
    });
    return map;
  }, [profiles]);

  // Merge comments and activity into unified timeline
  const timeline: TimelineItem[] = React.useMemo(() => {
    const items: TimelineItem[] = [];
    
    comments.forEach(c => items.push({ type: 'comment', data: c }));
    
    activityLogs.forEach(log => {
      const profile = activityProfilesMap[log.user_id];
      items.push({
        type: 'activity',
        data: log,
        userName: profile?.full_name || 'Usuário',
        avatarUrl: profile?.avatar_url,
        fromColumnName: columnsMap[log.from_column_id] || '?',
        toColumnName: columnsMap[log.to_column_id] || '?',
      });
    });

    items.sort((a, b) => {
      const dateA = a.type === 'comment' ? a.data.created_at : a.data.created_at;
      const dateB = b.type === 'comment' ? b.data.created_at : b.data.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return items;
  }, [comments, activityLogs, activityProfilesMap, columnsMap]);

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
    onSuccess: (data, content) => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      if (data) {
        const mentionedIds = extractMentionedUserIds(content, profiles);
        if (mentionedIds.length > 0) {
          createMentions.mutate({ commentId: data.id, cardId, mentionedUserIds: mentionedIds });
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
    if (!newNote.trim()) return;
    addComment.mutate(newNote.trim());
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
    <div ref={ref} className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
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
      {isEditor && (
        <div className="p-3 border-b bg-background">
          {/* Quick action buttons */}
          <div className="flex gap-1 mb-2">
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
          </div>
          <MentionTextarea
            value={newNote}
            onChange={setNewNote}
            onSubmit={handleSubmit}
            placeholder="Escrever um comentário... Use @ para mencionar"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground hidden md:inline">Shift+Enter para nova linha</span>
            <Button 
              onClick={handleSubmit} 
              disabled={!newNote.trim() || addComment.isPending}
              size="sm"
              className="h-7 px-3"
            >
              <Send className="h-3 w-3 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      )}

      {/* Unified Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
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
                  <div key={`activity-${item.data.id}`} className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs border border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={item.avatarUrl} alt={item.userName} />
                        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {getInitials(item.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <ArrowRightCircle className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-foreground">{item.userName}</span>
                            {' moveu de '}
                            <span className="font-medium text-foreground">{item.fromColumnName}</span>
                            {' para '}
                            <span className="font-medium text-foreground">{item.toColumnName}</span>
                          </span>
                        </div>
                        <span className="text-muted-foreground mt-0.5 block">
                          {format(new Date(item.data.created_at), "dd 'de' MMM. yyyy, HH:mm", { locale: ptBR })}
                        </span>
                      </div>
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
                <div key={comment.id} className="p-2 bg-background rounded-lg group text-xs">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} alt={comment.profile?.full_name} />
                      <AvatarFallback className="text-[10px] bg-primary/10">
                        {getInitials(comment.profile?.full_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium text-foreground">
                          {comment.profile?.full_name || 'Usuário'}
                        </span>
                        <a href="#" className="text-muted-foreground hover:underline" onClick={(e) => e.preventDefault()}>
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
                          <p className="text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                            {renderMentionText(comment.content, profiles).map((part, i) => 
                              part.type === 'mention' ? (
                                <span key={i} className="text-primary font-medium">{part.content}</span>
                              ) : (
                                <span key={i}>{part.content}</span>
                              )
                            )}
                          </p>
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
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
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
