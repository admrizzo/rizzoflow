import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

 export function useCardViews(boardId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

   // Fetch user's view timestamps
   const { data: viewsMap = new Map<string, Date>() } = useQuery({
     queryKey: ['card-views', user?.id, boardId],
     queryFn: async () => {
       if (!user?.id || !boardId) return new Map<string, Date>();
       const { data, error } = await supabase
         .from('card_views')
         .select('card_id, last_viewed_at')
         .eq('user_id', user.id);
       if (error) throw error;
       return new Map(data.map(v => [v.card_id, new Date(v.last_viewed_at)]));
     },
     enabled: !!user?.id && !!boardId,
     staleTime: 60000,
   });
 
   // Fetch unread counts based on notifications, mentions AND relevant activity
   const { data: unreadCounts = {} } = useQuery({
     queryKey: ['unread-card-changes', user?.id, boardId, Array.from(viewsMap.entries())],
     queryFn: async () => {
       if (!user?.id) return {};
       const counts: Record<string, number> = {};
 
       // 1. Unread notifications
       const notifsRes = await supabase.from('notifications').select('card_id').eq('user_id', user.id).eq('is_read', false).not('card_id', 'is', null);
       if (notifsRes.data) notifsRes.data.forEach(n => { if (n.card_id) counts[n.card_id] = (counts[n.card_id] || 0) + 1; });
 
       // 2. Unread mentions
       const mentionsRes = await supabase.from('comment_mentions').select('card_id').eq('mentioned_user_id', user.id).eq('is_read', false);
       if (mentionsRes.data) mentionsRes.data.forEach(m => { if (m.card_id) counts[m.card_id] = (counts[m.card_id] || 0) + 1; });
 
       // 3. Relevant Activity Logs (since last view)
       // Only for cards the user has already viewed at least once (to avoid noise on new boards)
       const viewedCardIds = Array.from(viewsMap.keys());
       if (viewedCardIds.length > 0) {
         const { data: activityLogs } = await supabase
           .from('card_activity_logs')
           .select('card_id, created_at, actor_user_id')
           .in('card_id', viewedCardIds)
           .neq('actor_user_id', user.id)
           .order('created_at', { ascending: false });
 
         if (activityLogs) {
           activityLogs.forEach(log => {
             const lastView = viewsMap.get(log.card_id);
             if (lastView && new Date(log.created_at) > lastView) {
               // Only increment if we haven't already counted notifications/mentions for this card 
               // to keep it sane, or just ensure it's at least 1.
               if (!counts[log.card_id]) counts[log.card_id] = 1;
             }
           });
         }
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
