import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InteractionRankingRow {
  user_id: string;
  user_name: string;
  checklist_completions: number;
  comments_count: number;
  card_moves: number;
  total_interactions: number;
}

interface UseInteractionRankingParams {
  boardId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useInteractionRanking({ boardId, startDate, endDate }: UseInteractionRankingParams) {
  return useQuery({
    queryKey: ['interaction-ranking', boardId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_interaction_ranking', {
        _board_id: boardId || null,
        _start_date: startDate?.toISOString() || null,
        _end_date: endDate?.toISOString() || null,
      });

      if (error) throw error;
      return (data || []) as InteractionRankingRow[];
    },
  });
}
