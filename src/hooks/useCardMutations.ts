import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { logCardActivity } from '@/hooks/useCardActivityLogs';
import { invalidateCardQueries } from '@/lib/queryInvalidation';

/**
 * Hook leve com APENAS as mutations operacionais usadas dentro do
 * `CardDetailDialog` (e qualquer tela que abra um card sem precisar
 * carregar a lista inteira do board).
 *
 * O motivo de existir: `useCards(boardId)` faz uma query enorme
 * (todos os cards do board + checklists + items + labels + members + perfis).
 * Ao abrir um card pela "Minha Fila", não precisamos disso só para ter
 * `updateCard.mutate(...)`. Esse hook elimina esse round-trip pesado.
 *
 * Mantemos a mesma assinatura de mutation (`updateCard`, `deleteCard`,
 * `archiveCard`, `transferCard`) para que o componente consumidor
 * continue chamando `mutate({ id, ... })` exatamente como antes.
 *
 * Snapshots "old vs new" para histórico (que antes vinham do array de cards)
 * agora são lidos diretamente do banco antes do update — custo de 1 SELECT
 * single-row, muito mais barato do que carregar o board inteiro.
 */
export function useCardMutations(boardId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { config: boardConfig } = useBoardConfig(boardId);

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Card> & { id: string }) => {
      // Snapshot mínimo apenas dos campos rastreados — single row, sem joins.
      let prev: Pick<
        Card,
        'next_action' | 'next_action_due_date' | 'responsible_user_id'
      > | null = null;
      const tracksHistory =
        Object.prototype.hasOwnProperty.call(updates, 'next_action') ||
        Object.prototype.hasOwnProperty.call(updates, 'next_action_due_date') ||
        Object.prototype.hasOwnProperty.call(updates, 'responsible_user_id');

      if (tracksHistory) {
        const { data } = await supabase
          .from('cards')
          .select('next_action, next_action_due_date, responsible_user_id')
          .eq('id', id)
          .maybeSingle();
        prev = (data as any) ?? null;
      }

      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Histórico: alterações operacionais relevantes (best-effort)
      try {
        if (prev && Object.prototype.hasOwnProperty.call(updates, 'next_action')) {
          const before = prev.next_action || '';
          const after = (updates as any).next_action || '';
          if (before !== after) {
            void logCardActivity({
              cardId: id,
              actorUserId: user?.id,
              eventType: 'next_action_changed',
              title: after ? 'Próxima ação atualizada' : 'Próxima ação removida',
              description: after || before,
              oldValue: before || null,
              newValue: after || null,
            });
          }
        }

        if (prev && Object.prototype.hasOwnProperty.call(updates, 'next_action_due_date')) {
          const before = prev.next_action_due_date || null;
          const after = (updates as any).next_action_due_date || null;
          if (before !== after) {
            void logCardActivity({
              cardId: id,
              actorUserId: user?.id,
              eventType: 'due_date_changed',
              title: after ? 'Prazo da próxima ação atualizado' : 'Prazo removido',
              oldValue: before,
              newValue: after,
            });
          }
        }

        if (prev && Object.prototype.hasOwnProperty.call(updates, 'responsible_user_id')) {
          const before = prev.responsible_user_id || null;
          const after = (updates as any).responsible_user_id || null;
          if (before !== after) {
            let newName: string | null = null;
            if (after) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', after)
                .maybeSingle();
              newName = prof?.full_name || null;
            }
            void logCardActivity({
              cardId: id,
              actorUserId: user?.id,
              eventType: 'responsible_changed',
              title: after ? `Responsável alterado para ${newName || 'novo usuário'}` : 'Responsável removido',
              oldValue: { id: before, name: null },
              newValue: { id: after, name: newName },
            });

            // Notifica o novo responsável (não notifica si mesmo)
            if (after && after !== user?.id) {
              try {
                const { data: cardInfo } = await supabase
                  .from('cards')
                  .select('card_number, next_action')
                  .eq('id', id)
                  .maybeSingle();
                const cardNumber = cardInfo?.card_number;
                const action = cardInfo?.next_action?.trim();
                const message = action
                  ? `Você foi definido como responsável pela próxima ação${cardNumber ? ` no card #${cardNumber}` : ''}: ${action}`
                  : `Você foi definido como responsável por uma próxima ação${cardNumber ? ` no card #${cardNumber}` : ''}`;
                await supabase.from('notifications').insert({
                  user_id: after,
                  card_id: id,
                  title: 'Você foi atribuído como responsável',
                  message,
                });
              } catch (notifErr) {
                console.warn('[useCardMutations] notificação responsável falhou:', notifErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[useCardMutations.updateCard] log falhou:', err);
      }

      return data;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Card excluído com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const archiveCard = useMutation({
    mutationFn: async ({
      cardId,
      isArchived,
      reason,
    }: {
      cardId: string;
      isArchived: boolean;
      reason: string | null;
    }) => {
      const { error } = await supabase
        .from('cards')
        .update({
          is_archived: isArchived,
          archive_reason: reason,
          archived_at: isArchived ? new Date().toISOString() : null,
          archived_by: isArchived ? user?.id : null,
        })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateCardQueries(queryClient);
      toast({ title: variables.isArchived ? 'Card arquivado!' : 'Card restaurado!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao arquivar card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const transferCard = useMutation({
    mutationFn: async ({
      cardId,
      newOwnerId,
    }: {
      cardId: string;
      newOwnerId: string;
    }) => {
      // Para validar a regra de "só dono ou admin pode transferir", lemos o card
      // direto do banco (uma linha) em vez de depender de uma lista carregada.
      if (!isAdmin) {
        const { data: card, error: readErr } = await supabase
          .from('cards')
          .select('created_by')
          .eq('id', cardId)
          .maybeSingle();
        if (readErr) throw readErr;
        if (!card) throw new Error('Card não encontrado');
        if (card.created_by !== user?.id) {
          throw new Error('Você só pode transferir cards que você criou');
        }
      }

      const { error } = await supabase
        .from('cards')
        .update({ created_by: newOwnerId })
        .eq('id', cardId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Card transferido com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao transferir card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateCard,
    deleteCard,
    archiveCard,
    transferCard,
    ownerOnlyVisibility: boardConfig?.owner_only_visibility ?? false,
  };
}
