import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CardView {
  card_id: string;
  last_viewed_at: string;
}

export function useCardViews(boardId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all card views for current user in this board
  const { data: cardViews = [] } = useQuery({
    queryKey: ['card-views', user?.id, boardId],
    queryFn: async () => {
      if (!user?.id || !boardId) return [];

      // Get all cards in this board first
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('id')
        .eq('board_id', boardId);

      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) return [];

      const cardIds = cards.map(c => c.id);

      // Get user's views for these cards
      const { data, error } = await supabase
        .from('card_views')
        .select('card_id, last_viewed_at')
        .eq('user_id', user.id)
        .in('card_id', cardIds);

      if (error) throw error;
      return (data || []) as CardView[];
    },
    enabled: !!user?.id && !!boardId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 120000,
    refetchOnWindowFocus: false,
  });

  // Create a map for quick lookup
  const viewsMap = new Map(cardViews.map(v => [v.card_id, new Date(v.last_viewed_at)]));

  // Check if card has unseen changes
  const hasUnseenChanges = (cardId: string, updatedAt: string): boolean => {
    const lastViewed = viewsMap.get(cardId);
    
    // If never viewed by this user, we don't mark as "unseen" (new change) 
    // unless we have a specific milestone. For now, being conservative:
    // only mark as unseen if we HAVE a previous view and the card was updated since then.
    if (!lastViewed) return false;

    return new Date(updatedAt) > lastViewed;
  };

  // Mark card as viewed
  const markAsViewed = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('card_views')
        .upsert({
          card_id: cardId,
          user_id: user.id,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'card_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate to refresh the views
      queryClient.invalidateQueries({ queryKey: ['card-views', user?.id, boardId] });
    },
  });

  return {
    hasUnseenChanges,
    markAsViewed: markAsViewed.mutate,
  };
}
