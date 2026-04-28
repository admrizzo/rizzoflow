import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardWithRelations, GuaranteeType, ContractType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBoardConfig } from '@/hooks/useBoardConfig';
import { useUserBoards } from '@/hooks/useUserBoards';
import { logCardActivity } from '@/hooks/useCardActivityLogs';
import { invalidateCardQueries } from '@/lib/queryInvalidation';

export function useCards(boardId?: string, options?: { includeArchived?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { config: boardConfig } = useBoardConfig(boardId);
  const { isBoardAdmin } = useUserBoards();

  const includeArchived = options?.includeArchived ?? false;

  // Check if current user is board admin for this specific board
  const isCurrentUserBoardAdmin = boardId && user?.id ? isBoardAdmin(user.id, boardId) : false;

  const cardsQueryKey = ['cards', boardId, includeArchived, boardConfig?.owner_only_visibility, user?.id, isAdmin, isCurrentUserBoardAdmin] as const;

  const { data: cards = [], isLoading } = useQuery({
    queryKey: cardsQueryKey,
    queryFn: async () => {
      let query = supabase
        .from('cards')
        .select(`
          *,
          column:columns(*),
          card_labels(label:labels(*)),
          card_members(user_id, assigned_at),
          checklists(*, items:checklist_items(*)),
          proposal_link:proposal_links(id, status)
        `)
        .order('position');

      // Only filter out archived cards when not explicitly including them
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      
      if (boardId) {
        query = query.eq('board_id', boardId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Collect ALL user IDs in one pass
      const allUserIds = new Set<string>();
      
      data.forEach(card => {
        card.card_members?.forEach((cm: any) => cm.user_id && allUserIds.add(cm.user_id));
        if (card.created_by) allUserIds.add(card.created_by);
        if (card.archived_by) allUserIds.add(card.archived_by);
        if (card.deadline_met_by) allUserIds.add(card.deadline_met_by);
        if (card.deadline_dispensed_by) allUserIds.add(card.deadline_dispensed_by);
        if (card.deadline_edited_by) allUserIds.add(card.deadline_edited_by);
        if (card.vacancy_deadline_met_by) allUserIds.add(card.vacancy_deadline_met_by);
        if (card.last_reviewed_by) allUserIds.add(card.last_reviewed_by);
        if (card.last_moved_by) allUserIds.add(card.last_moved_by);
        if (card.responsible_user_id) allUserIds.add(card.responsible_user_id);
        
        card.checklists?.forEach((c: any) => {
          c.items?.forEach((item: any) => {
            if (item.completed_by) allUserIds.add(item.completed_by);
            if (item.dismissed_by) allUserIds.add(item.dismissed_by);
          });
        });
      });
      
      // Single query for all profiles
      let profilesMap: Record<string, any> = {};
      const userIdsArray = Array.from(allUserIds);
      if (userIdsArray.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIdsArray);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      let cardsData = data.map(card => ({
        ...card,
        labels: card.card_labels?.map((cl: any) => cl.label) || [],
        members: card.card_members?.map((cm: any) => profilesMap[cm.user_id]).filter(Boolean) || [],
        created_by_profile: card.created_by ? profilesMap[card.created_by] : null,
        archived_by_profile: card.archived_by ? profilesMap[card.archived_by] : null,
        deadline_met_by_profile: card.deadline_met_by ? profilesMap[card.deadline_met_by] : null,
        deadline_dispensed_by_profile: card.deadline_dispensed_by ? profilesMap[card.deadline_dispensed_by] : null,
        deadline_edited_by_profile: card.deadline_edited_by ? profilesMap[card.deadline_edited_by] : null,
        vacancy_deadline_met_by_profile: card.vacancy_deadline_met_by ? profilesMap[card.vacancy_deadline_met_by] : null,
        last_reviewed_by_profile: card.last_reviewed_by ? profilesMap[card.last_reviewed_by] : null,
        last_moved_by_profile: card.last_moved_by ? profilesMap[card.last_moved_by] : null,
        responsible_user_profile: card.responsible_user_id ? profilesMap[card.responsible_user_id] : null,
        checklists: card.checklists?.map((c: any) => ({
          ...c,
          items: (c.items || []).map((item: any) => ({
            ...item,
            completed_by_profile: item.completed_by ? profilesMap[item.completed_by] : null,
            dismissed_by_profile: item.dismissed_by ? profilesMap[item.dismissed_by] : null,
          }))
        })) || [],
      })) as CardWithRelations[];

      // Filter cards based on owner_only_visibility setting
      // Super admins and board admins can see all cards
      if (boardConfig?.owner_only_visibility && !isAdmin && !isCurrentUserBoardAdmin && user?.id) {
        cardsData = cardsData.filter(card => card.created_by === user.id);
      }

      return cardsData;
    },
    enabled: !!boardId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    placeholderData: (prev) => prev, // Keep previous data while loading
  });

  const createCard = useMutation({
    mutationFn: async (card: { 
      title: string; 
      robust_code?: string;
      building_name?: string;
      superlogica_id?: string;
      column_id: string;
      board_id: string;
      address?: string;
      description?: string;
      guarantee_type?: GuaranteeType;
      contract_type?: ContractType;
      card_type?: 'com_financiamento' | 'sem_financiamento';
    }) => {
      const cardsInColumn = cards.filter(c => c.column_id === card.column_id);
      const maxPosition = cardsInColumn.length > 0 
        ? Math.max(...cardsInColumn.map(c => c.position)) + 1 
        : 0;

      // Create the card with column_entered_at for review tracking
      const { data: newCard, error } = await supabase
        .from('cards')
        .insert({ 
          ...card, 
          position: maxPosition,
          created_by: user?.id,
          column_entered_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;

      // Histórico: criação do card
      void logCardActivity({
        cardId: newCard.id,
        actorUserId: user?.id,
        eventType: 'card_created',
        title: 'Card criado',
        description: card.title,
      });

      // Fetch checklist templates for this board
      // SKIP for boards that handle checklists via card templates (Administrativo)
      const ADMINISTRATIVO_BOARD_ID = 'e9a38d52-7403-4aec-87af-c886774af748';
      
      if (card.board_id !== ADMINISTRATIVO_BOARD_ID) {
        const { data: templates } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('board_id', card.board_id)
          .order('position');

        if (templates && templates.length > 0) {
          // For Venda board, only auto-create IMÓVEL checklist
          // Party checklists (COMPRADOR, VENDEDOR, PROCURADOR, VENDEDORES ANTERIORES) 
          // are created via createDefaultParties (AddCardButton) and addParty (useCardParties)
          const VENDA_BOARD_ID = '04ab7bde-6142-4644-a158-a3a232486b30';
          const PARTY_TEMPLATES = [
            'COMPRADOR (COM FINANCIAMENTO)',
            'COMPRADOR (SEM FINANCIAMENTO)',
            'VENDEDOR',
            'PROCURADOR',
            'VENDEDORES ANTERIORES'
          ];
          
          const isVendaBoard = card.board_id === VENDA_BOARD_ID;
          
          // Create checklists from templates (excluding party templates for Venda board)
          for (const template of templates) {
            // Skip party templates for Venda board - they're created through card_parties
            if (isVendaBoard && PARTY_TEMPLATES.includes(template.name)) {
              continue;
            }
            
            const { data: newChecklist } = await supabase
              .from('checklists')
              .insert({
                card_id: newCard.id,
                name: template.name,
                position: template.position
              })
              .select()
              .single();

            if (newChecklist) {
              // Fetch template items
              const { data: templateItems } = await supabase
                .from('checklist_item_templates')
                .select('*')
                .eq('template_id', template.id)
                .order('position');

              if (templateItems && templateItems.length > 0) {
                // Create checklist items with all dynamic field configurations
                const items = templateItems.map(item => ({
                  checklist_id: newChecklist.id,
                  content: item.content,
                  position: item.position ?? 0,
                  requires_date: item.requires_date ?? false,
                  requires_status: item.requires_status ?? false,
                  requires_observation: item.requires_observation ?? false,
                  status_options: item.status_options ?? null,
                }));

                await supabase.from('checklist_items').insert(items);
              }
            }
          }
        }
      }

      return newCard;
    },
    onSuccess: () => {
      invalidateCardQueries(queryClient);
      toast({ title: 'Card criado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar card', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Card> & { id: string }) => {
      // Snapshot anterior para campos rastreados (responsável, próxima ação, prazo)
      const prev = cards.find((c) => c.id === id);

      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Histórico: alterações operacionais relevantes
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
            // Resolver nome do novo responsável (best-effort)
            let newName: string | null = null;
            if (after) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', after)
                .maybeSingle();
              newName = prof?.full_name || null;
            }
            const oldName = prev.responsible_user_profile?.full_name || null;
            void logCardActivity({
              cardId: id,
              actorUserId: user?.id,
              eventType: 'responsible_changed',
              title: after ? `Responsável alterado para ${newName || 'novo usuário'}` : 'Responsável removido',
              oldValue: { id: before, name: oldName },
              newValue: { id: after, name: newName },
            });
          }
        }
      } catch (err) {
        console.warn('[useCards.updateCard] log falhou:', err);
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
        variant: 'destructive' 
      });
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);
      
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
        variant: 'destructive' 
      });
    },
  });

  const moveCard = useMutation({
    mutationFn: async ({ 
      cardId, 
      newColumnId, 
      newPosition 
    }: { 
      cardId: string; 
      newColumnId: string; 
      newPosition: number;
    }) => {
      // Check if column is changing
      const currentCard = cards.find(c => c.id === cardId);
      const isColumnChange = currentCard && currentCard.column_id !== newColumnId;

      const updateData: any = { 
        column_id: newColumnId, 
        position: newPosition,
        // Always track who moved the card and when
        last_moved_by: user?.id,
        last_moved_at: new Date().toISOString(),
      };

      // If column changed, reset review tracking
      if (isColumnChange) {
        updateData.column_entered_at = new Date().toISOString();
        updateData.last_reviewed_at = null;
        updateData.last_reviewed_by = null;
      }

      // First, get all cards in the destination column (excluding the moving card)
      const destCards = cards
        .filter(c => c.column_id === newColumnId && c.id !== cardId && !c.is_archived)
        .sort((a, b) => a.position - b.position);

      // Insert the moving card at the new position and recalculate all positions
      const clampedIndex = Math.max(0, Math.min(newPosition, destCards.length));
      const reorderedDest: { id: string; position: number }[] = [];
      let inserted = false;
      let pos = 0;
      for (let i = 0; i <= destCards.length; i++) {
        if (i === clampedIndex) {
          reorderedDest.push({ id: cardId, position: pos++ });
          inserted = true;
        }
        if (i < destCards.length) {
          reorderedDest.push({ id: destCards[i].id, position: pos++ });
        }
      }
      if (!inserted) {
        reorderedDest.push({ id: cardId, position: pos++ });
      }

      // If column changed, also reposition remaining source column cards
      if (isColumnChange && currentCard) {
        const sourceCards = cards
          .filter(c => c.column_id === currentCard.column_id && c.id !== cardId && !c.is_archived)
          .sort((a, b) => a.position - b.position);
        
        // Update source column positions
        const sourceUpdates = sourceCards.map((c, idx) => 
          supabase.from('cards').update({ position: idx }).eq('id', c.id)
        );
        await Promise.all(sourceUpdates);
      }

      // Update all destination column cards with their new positions
      const destUpdates = reorderedDest.map(({ id, position }) => {
        if (id === cardId) {
          return supabase.from('cards').update({ ...updateData, position }).eq('id', id);
        }
        return supabase.from('cards').update({ position }).eq('id', id);
      });
      await Promise.all(destUpdates);

      // Log column change to activity log
      if (isColumnChange && currentCard) {
        await supabase
          .from('card_activity_log')
          .insert({
            card_id: cardId,
            user_id: user?.id,
            from_column_id: currentCard.column_id,
            to_column_id: newColumnId,
          });

        // Histórico humano (card_activity_logs)
        try {
          const { data: cols } = await supabase
            .from('columns')
            .select('id, name')
            .in('id', [currentCard.column_id, newColumnId].filter(Boolean) as string[]);
          const fromName = cols?.find((c) => c.id === currentCard.column_id)?.name || 'Etapa anterior';
          const toName = cols?.find((c) => c.id === newColumnId)?.name || 'Nova etapa';
          void logCardActivity({
            cardId,
            actorUserId: user?.id,
            eventType: 'column_changed',
            title: `Moveu de ${fromName} para ${toName}`,
            oldValue: { id: currentCard.column_id, name: fromName },
            newValue: { id: newColumnId, name: toName },
          });
        } catch (err) {
          console.warn('[useCards.moveCard] log falhou:', err);
        }
      }
    },
    // Optimistic update - instantly move card in UI
    onMutate: async ({ cardId, newColumnId, newPosition }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: cardsQueryKey });
      
      // Snapshot the previous value
      const previousCards = queryClient.getQueryData<CardWithRelations[]>(cardsQueryKey);

      // Helper: stable sort by position then created_at to reduce jitter
      const sortByPosition = (a: CardWithRelations, b: CardWithRelations) => {
        if (a.position !== b.position) return a.position - b.position;
        return (a.created_at || '').localeCompare(b.created_at || '');
      };
      
      // Optimistically update the cache
      if (previousCards) {
        const moving = previousCards.find(c => c.id === cardId);

        // If we can't find the card, fallback to a minimal optimistic update
        if (!moving) {
          const updatedCards = previousCards.map(card =>
            card.id === cardId ? { ...card, column_id: newColumnId, position: newPosition } : card
          );
          queryClient.setQueryData(cardsQueryKey, updatedCards);
        } else {
          const sourceColumnId = moving.column_id;

          // Build ordered lists for source/destination columns (excluding the moving card)
          const sourceCards = previousCards
            .filter(c => c.column_id === sourceColumnId && c.id !== cardId)
            .slice()
            .sort(sortByPosition);

          const destCards = previousCards
            .filter(c => c.column_id === newColumnId && c.id !== cardId)
            .slice()
            .sort(sortByPosition);

          // Insert moving card into destination at the intended index
          const clampedIndex = Math.max(0, Math.min(newPosition, destCards.length));
          const movingInDest: CardWithRelations = {
            ...moving,
            column_id: newColumnId,
          };
          destCards.splice(clampedIndex, 0, movingInDest);

          // Reassign positions sequentially to avoid tie/jitter
          const updatedMap = new Map<string, CardWithRelations>();

          sourceCards.forEach((c, idx) => {
            updatedMap.set(c.id, { ...c, position: idx });
          });
          destCards.forEach((c, idx) => {
            updatedMap.set(c.id, { ...c, position: idx });
          });

          // Keep all other cards unchanged
          const updatedCards = previousCards.map(c => updatedMap.get(c.id) ?? c);
          queryClient.setQueryData(cardsQueryKey, updatedCards);
        }
      }
      
      // Return context with snapshot
      return { previousCards };
    },
    // If mutation fails, rollback to previous state
    onError: (err, variables, context) => {
      if (context?.previousCards) {
        queryClient.setQueryData(cardsQueryKey, context.previousCards);
      }
      toast({ 
        title: 'Erro ao mover card', 
        description: 'Tente novamente',
        variant: 'destructive' 
      });
    },
    // Always refetch after success or error
    onSettled: () => {
      invalidateCardQueries(queryClient);
    },
  });

  const archiveCard = useMutation({
    mutationFn: async ({ 
      cardId, 
      isArchived, 
      reason 
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
          archived_by: isArchived ? user?.id : null
        })
        .eq('id', cardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateCardQueries(queryClient);
      toast({ 
        title: variables.isArchived ? 'Card arquivado!' : 'Card restaurado!' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao arquivar card', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const setDeadlineMet = useMutation({
    mutationFn: async ({ 
      cardId, 
      isMet 
    }: { 
      cardId: string; 
      isMet: boolean;
    }) => {
      const { error } = await supabase
        .from('cards')
        .update({ 
          deadline_met: isMet,
          deadline_met_at: isMet ? new Date().toISOString() : null,
          deadline_met_by: isMet ? user?.id : null
        })
        .eq('id', cardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateCardQueries(queryClient);
      toast({ 
        title: variables.isMet ? 'Prazo marcado como cumprido!' : 'Prazo reaberto!' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar prazo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const notifyDeadlineOverdue = useMutation({
    mutationFn: async ({ 
      cardId, 
      userId, 
      cardTitle 
    }: { 
      cardId: string; 
      userId: string;
      cardTitle: string;
    }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          card_id: cardId,
          title: 'Prazo de documentos vencido',
          message: `O prazo para envio de documentos do card "${cardTitle}" venceu.`
        });
      
      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error sending notification:', error);
    },
  });

  const setDeadlineDispensed = useMutation({
    mutationFn: async ({ 
      cardId, 
      isDispensed 
    }: { 
      cardId: string; 
      isDispensed: boolean;
    }) => {
      const { error } = await supabase
        .from('cards')
        .update({ 
          deadline_dispensed: isDispensed,
          deadline_dispensed_at: isDispensed ? new Date().toISOString() : null,
          deadline_dispensed_by: isDispensed ? user?.id : null,
          // Clear deadline if dispensing
          document_deadline: isDispensed ? null : undefined,
          deadline_met: isDispensed ? false : undefined,
          deadline_met_at: isDispensed ? null : undefined,
          deadline_met_by: isDispensed ? null : undefined,
        })
        .eq('id', cardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateCardQueries(queryClient);
      toast({ 
        title: variables.isDispensed ? 'Prazo dispensado!' : 'Prazo reativado!' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao dispensar prazo', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const setVacancyDeadlineMet = useMutation({
    mutationFn: async ({ 
      cardId, 
      isMet 
    }: { 
      cardId: string; 
      isMet: boolean;
    }) => {
      const { error } = await supabase
        .from('cards')
        .update({ 
          vacancy_deadline_met: isMet,
          vacancy_deadline_met_at: isMet ? new Date().toISOString() : null,
          vacancy_deadline_met_by: isMet ? user?.id : null
        })
        .eq('id', cardId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateCardQueries(queryClient);
      toast({ 
        title: variables.isMet ? 'Entrega confirmada!' : 'Confirmação removida!' 
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao confirmar entrega', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const notifyVacancyDeadlineOverdue = useMutation({
    mutationFn: async ({ 
      cardId, 
      userId, 
      cardTitle 
    }: { 
      cardId: string; 
      userId: string;
      cardTitle: string;
    }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          card_id: cardId,
          title: 'Prazo de desocupação vencido',
          message: `O prazo de desocupação do card "${cardTitle}" venceu.`
        });
      
      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error sending notification:', error);
    },
  });

  const transferCard = useMutation({
    mutationFn: async ({ 
      cardId, 
      newOwnerId 
    }: { 
      cardId: string; 
      newOwnerId: string;
    }) => {
      // Check if user can transfer this card
      const card = cards.find(c => c.id === cardId);
      if (!card) throw new Error('Card não encontrado');

      // Non-admins can only transfer their own cards
      if (!isAdmin && card.created_by !== user?.id) {
        throw new Error('Você só pode transferir cards que você criou');
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
        variant: 'destructive' 
      });
    },
  });

  return {
    cards,
    isLoading,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    archiveCard,
    setDeadlineMet,
    setDeadlineDispensed,
    notifyDeadlineOverdue,
    setVacancyDeadlineMet,
    notifyVacancyDeadlineOverdue,
    transferCard,
    ownerOnlyVisibility: boardConfig?.owner_only_visibility ?? false,
  };
}
