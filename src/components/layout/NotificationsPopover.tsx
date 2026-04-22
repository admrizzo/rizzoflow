import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyMentions } from '@/hooks/useCommentMentions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bell, Check, ExternalLink, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  card_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsPopoverProps {
  onOpenCard?: (cardId: string, boardId: string) => void;
}

type TabFilter = 'all' | 'mentions';

export function NotificationsPopover({ onOpenCard }: NotificationsPopoverProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const { myMentions, unreadCount: unreadMentions } = useMyMentions();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markMentionRead = useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('comment_mentions')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', mentionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['comment-mentions'] });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    if (notification.card_id && onOpenCard) {
      try {
        const { data: card, error } = await supabase
          .from('cards')
          .select('board_id')
          .eq('id', notification.card_id)
          .single();
        
        if (!error && card?.board_id) {
          setOpen(false);
          onOpenCard(notification.card_id, card.board_id);
        }
      } catch (err) {
        console.error('Error fetching card for notification:', err);
      }
    }
  };

  const handleMentionClick = async (mention: typeof myMentions[0]) => {
    if (!mention.is_read) {
      markMentionRead.mutate(mention.id);
    }

    if (mention.card_id && onOpenCard) {
      try {
        const { data: card, error } = await supabase
          .from('cards')
          .select('board_id')
          .eq('id', mention.card_id)
          .single();
        
        if (!error && card?.board_id) {
          setOpen(false);
          onOpenCard(mention.card_id, card.board_id);
        }
      } catch (err) {
        console.error('Error fetching card for mention:', err);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const totalUnread = unreadCount + unreadMentions;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-white hover:bg-white/20">
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-red-500">
              {totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {tab === 'all' && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check className="h-4 w-4 mr-1" />
              Marcar como lidas
            </Button>
          )}
        </div>

        {/* Tab filter */}
        <div className="flex border-b">
          <button
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
              tab === 'all'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab('all')}
          >
            Todas
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </button>
          <button
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1",
              tab === 'mentions'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab('mentions')}
          >
            <AtSign className="h-3 w-3" />
            Menções
            {unreadMentions > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{unreadMentions}</Badge>
            )}
          </button>
        </div>

        <ScrollArea className="h-[300px]">
          {tab === 'all' ? (
            notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      !notification.is_read && "bg-muted/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm flex-1">{notification.title}</p>
                          {notification.card_id && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            myMentions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma menção
              </div>
            ) : (
              <div className="divide-y">
                {myMentions.map((mention) => (
                  <div
                    key={mention.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      !mention.is_read && "bg-muted/30"
                    )}
                    onClick={() => handleMentionClick(mention)}
                  >
                    <div className="flex items-start gap-2">
                      {!mention.is_read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <AtSign className="h-3 w-3 text-primary flex-shrink-0" />
                          <p className="font-medium text-sm flex-1">Você foi mencionado</p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(mention.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                        {mention.is_read ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Check className="h-3 w-3" /> Lido
                          </span>
                        ) : (
                          <span className="text-[10px] text-primary mt-1">Não lido</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}