import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, Column } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isDateOverdue } from '@/lib/dateUtils';

export function getDaysInColumn(card: Card): number {
  // Use last_reviewed_at if exists, otherwise use column_entered_at
  const referenceDate = card.last_reviewed_at || card.column_entered_at;
  if (!referenceDate) return 0;
  
  return differenceInDays(new Date(), new Date(referenceDate));
}

export function isReviewOverdue(card: Card, column: Column | null): boolean {
  if (!column?.review_deadline_days) return false;

  // Use last_reviewed_at if exists, otherwise use column_entered_at
  const referenceDate = card.last_reviewed_at || card.column_entered_at;
  if (!referenceDate) return false;

  const dueDate = addDays(new Date(referenceDate), column.review_deadline_days);
  return isDateOverdue(dueDate);
}

export function getReviewDueDate(card: Card, column: Column | null): Date | null {
  if (!column?.review_deadline_days) return null;

  const referenceDate = card.last_reviewed_at || card.column_entered_at;
  if (!referenceDate) return null;

  return addDays(new Date(referenceDate), column.review_deadline_days);
}

export function getTimeUntilReview(card: Card, column: Column | null): string | null {
  const dueDate = getReviewDueDate(card, column);
  if (!dueDate) return null;

  if (isDateOverdue(dueDate)) {
    return `Vencido há ${formatDistanceToNow(dueDate, { locale: ptBR })}`;
  }

  return `Em ${formatDistanceToNow(dueDate, { locale: ptBR })}`;
}

export function useColumnReview(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const markAsReviewed = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('cards')
        .update({
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: user?.id,
        })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
      toast({ title: 'Marcado como olhado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao marcar como olhado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    markAsReviewed,
    isReviewOverdue,
    getReviewDueDate,
    getTimeUntilReview,
  };
}
