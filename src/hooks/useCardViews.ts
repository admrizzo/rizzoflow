import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

 export function useCardViews(boardId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

   // Fetch unread counts for all cards in this board
   const { data: unreadCounts = {} } = useQuery({
     queryKey: ['unread-card-changes', user?.id, boardId],
     queryFn: async () => {
       if (!user?.id) return {};
 
       const counts: Record<string, number> = {};
 
       // 1. Fetch unread notifications for this user
       const notificationsQuery = supabase
         .from('notifications')
         .select('card_id')
         .eq('user_id', user.id)
         .eq('is_read', false)
         .not('card_id', 'is', null);
 
       // 2. Fetch unread comment mentions for this user
       const mentionsQuery = supabase
         .from('comment_mentions')
         .select('card_id')
         .eq('mentioned_user_id', user.id)
         .eq('is_read', false);
 
       const [notifsRes, mentionsRes] = await Promise.all([
         notificationsQuery,
         mentionsQuery
       ]);
 
       if (notifsRes.data) {
         notifsRes.data.forEach(n => {
           if (n.card_id) counts[n.card_id] = (counts[n.card_id] || 0) + 1;
         });
       }
 
       if (mentionsRes.data) {
         mentionsRes.data.forEach(m => {
           if (m.card_id) counts[m.card_id] = (counts[m.card_id] || 0) + 1;
         });
       }
 
       return counts;
     },
     enabled: !!user?.id,
     staleTime: 30000,
     refetchOnWindowFocus: true,
   });
 
   const getUnreadCount = (cardId: string): number => {
     return unreadCounts[cardId] || 0;
   };

  // Mark card as viewed
  const markAsViewed = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user?.id) return;

       // Mark notifications as read for this card and user
       const notifPromise = supabase
         .from('notifications')
         .update({ is_read: true })
         .eq('card_id', cardId)
         .eq('user_id', user.id);
 
       // Mark mentions as read for this card and user
       const mentionPromise = supabase
         .from('comment_mentions')
         .update({ is_read: true, read_at: new Date().toISOString() })
         .eq('card_id', cardId)
         .eq('mentioned_user_id', user.id);
 
       // Also update last_viewed_at for consistency
       const viewPromise = supabase
         .from('card_views')
         .upsert({
           card_id: cardId,
           user_id: user.id,
           last_viewed_at: new Date().toISOString(),
         }, { onConflict: 'card_id,user_id' });
 
       await Promise.all([notifPromise, mentionPromise, viewPromise]);
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['unread-card-changes', user?.id] });
       queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  return {
     getUnreadCount,
    markAsViewed: markAsViewed.mutate,
  };
}
