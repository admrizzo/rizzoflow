import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CommentMention {
  id: string;
  comment_id: string;
  card_id: string;
  mentioned_user_id: string;
  mentioned_by: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useCommentMentions(cardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch mentions for a specific card
  const { data: cardMentions = [] } = useQuery({
    queryKey: ['comment-mentions', 'card', cardId],
    queryFn: async () => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('comment_mentions')
        .select('*')
        .eq('card_id', cardId);
      if (error) throw error;
      return data as CommentMention[];
    },
    enabled: !!cardId,
  });

  // Create mentions for a comment
  const createMentions = useMutation({
    mutationFn: async ({ commentId, cardId, mentionedUserIds }: {
      commentId: string;
      cardId: string;
      mentionedUserIds: string[];
    }) => {
      if (!user || mentionedUserIds.length === 0) return;

      // Insert mention records
      const mentionRows = mentionedUserIds.map(uid => ({
        comment_id: commentId,
        card_id: cardId,
        mentioned_user_id: uid,
        mentioned_by: user.id,
      }));

      const { error: mentionError } = await supabase
        .from('comment_mentions')
        .insert(mentionRows);
      if (mentionError) throw mentionError;

      // Create notifications for each mentioned user
      const { data: mentionerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const notificationRows = mentionedUserIds
        .filter(uid => uid !== user.id) // Don't notify yourself
        .map(uid => ({
          user_id: uid,
          card_id: cardId,
          title: 'Você foi mencionado',
          message: `${mentionerProfile?.full_name || 'Alguém'} mencionou você em um comentário`,
        }));

      if (notificationRows.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationRows);
        if (notifError) console.error('Error creating mention notifications:', notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark a mention as read
  const markMentionRead = useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('comment_mentions')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', mentionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['my-mentions'] });
    },
  });

  return {
    cardMentions,
    createMentions,
    markMentionRead,
  };
}

// Hook to get all mentions for current user (for filtering)
export function useMyMentions() {
  const { user } = useAuth();

  const { data: myMentions = [], isLoading } = useQuery({
    queryKey: ['my-mentions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('comment_mentions')
        .select('*')
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CommentMention[];
    },
    enabled: !!user,
  });

  const unreadCount = myMentions.filter(m => !m.is_read).length;

  return { myMentions, unreadCount, isLoading };
}
