import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoardProductivityReport {
  user_id: string;
  user_name: string;
  board_id: string;
  board_name: string;
  month: string;
  cards_created: number;
  cards_completed: number;
  cards_in_progress: number;
  avg_completion_hours: number | null;
}

interface UseBoardProductivityReportOptions {
  boardId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useBoardProductivityReport(options: UseBoardProductivityReportOptions = {}) {
  const { boardId, startDate, endDate } = options;

  return useQuery({
    queryKey: ['board-productivity-report', boardId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_board_productivity_report', {
        _board_id: boardId || null,
        _start_date: startDate?.toISOString() || null,
        _end_date: endDate?.toISOString() || null,
      });

      if (error) throw error;
      return (data || []) as BoardProductivityReport[];
    },
  });
}
