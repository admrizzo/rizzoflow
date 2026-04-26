import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type CardActivityEventType =
  | 'card_created'
  | 'column_changed'
  | 'responsible_changed'
  | 'next_action_changed'
  | 'due_date_changed'
  | 'checklist_created'
  | 'checklist_item_completed'
  | 'checklist_item_reopened'
  | 'comment_added';

export interface CardActivityLog {
  id: string;
  card_id: string;
  actor_user_id: string | null;
  event_type: CardActivityEventType | string;
  title: string;
  description: string | null;
  old_value: any;
  new_value: any;
  metadata: Record<string, any> | null;
  created_at: string;
  actor_profile?: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Logs de andamento (histórico) por card.
 * Falhas no INSERT NÃO devem bloquear o fluxo principal — sempre tratadas com console.warn.
 */
export function useCardActivityLogs(cardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const queryKey = ['card-activity-logs', cardId] as const;

  const { data: logs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<CardActivityLog[]> => {
      if (!cardId) return [];

      const { data, error } = await supabase
        .from('card_activity_logs')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as CardActivityLog[];

      const userIds = Array.from(
        new Set(rows.map((r) => r.actor_user_id).filter((id): id is string => !!id))
      );

      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        if (profiles) {
          profilesMap = profiles.reduce((acc, p: any) => {
            acc[p.user_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      return rows.map((r) => ({
        ...r,
        actor_profile: r.actor_user_id ? profilesMap[r.actor_user_id] || null : null,
      }));
    },
    enabled: !!cardId,
    staleTime: 15000,
  });

  const addManualComment = useMutation({
    mutationFn: async ({ cardId: cId, text }: { cardId: string; text: string }) => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error('Comentário vazio.');
      const { error } = await supabase.from('card_activity_logs').insert({
        card_id: cId,
        actor_user_id: user?.id ?? null,
        event_type: 'comment_added',
        title: 'Comentário de andamento',
        description: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Comentário adicionado ao histórico.' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao adicionar comentário',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return { logs, isLoading, addManualComment };
}

/**
 * Insert "fire-and-forget" para registrar evento sem bloquear o fluxo.
 * Usar dentro de mutations existentes.
 */
export async function logCardActivity(params: {
  cardId: string;
  actorUserId: string | null | undefined;
  eventType: CardActivityEventType;
  title: string;
  description?: string | null;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}) {
  try {
    const { error } = await supabase.from('card_activity_logs').insert({
      card_id: params.cardId,
      actor_user_id: params.actorUserId ?? null,
      event_type: params.eventType,
      title: params.title,
      description: params.description ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) {
      console.warn('[card_activity_logs] Falha ao registrar evento:', error.message);
    }
  } catch (err) {
    console.warn('[card_activity_logs] Exceção ao registrar evento:', err);
  }
}