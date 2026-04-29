import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';

/**
 * Realtime focado no card aberto no CardDetailDialog.
 *
 * Assina mudanças nas tabelas que afetam o card aberto e invalida apenas
 * as queries relacionadas a ele, com debounce para agrupar rajadas.
 *
 * Observações importantes:
 * - Não fecha o modal nem recarrega a página.
 * - Não toca em estados locais de inputs (comentário em edição, próxima ação,
 *   etc.). React Query apenas refaz o fetch dos dados externos; os componentes
 *   que mantêm estado local (CardNotesSidebar, CardDetailDialog) continuam com
 *   seus drafts intactos.
 * - Mostra um toast discreto ("Atualizado agora") quando há evento externo,
 *   sem disparar para o próprio usuário (filtra pelo actor/uploaded_by quando
 *   disponível).
 */
export function useOpenCardRealtime(params: {
  cardId: string | null | undefined;
  proposalLinkId: string | null | undefined;
  enabled: boolean;
  currentUserId?: string | null;
}) {
  const { cardId, proposalLinkId, enabled, currentUserId } = params;
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const externalChangeRef = useRef(false);
  const lastToastAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || !cardId) return;

    const flush = () => {
      debounceRef.current = null;
      // Invalida apenas o necessário para o card aberto.
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['card-detail-from-queue'] });
      qc.invalidateQueries({ queryKey: ['my-queue'] });
      qc.invalidateQueries({ queryKey: ['card-activity-logs', cardId] });
      qc.invalidateQueries({ queryKey: ['comments', cardId] });
      qc.invalidateQueries({ queryKey: ['proposal-documents', cardId] });
      qc.invalidateQueries({ queryKey: ['proposal-parties', cardId] });
      qc.invalidateQueries({ queryKey: ['correction-requests', 'card', cardId] });
      qc.invalidateQueries({ queryKey: ['proposal-negotiation-summary', proposalLinkId] });
      qc.invalidateQueries({ queryKey: ['proposal-link-public-token', proposalLinkId] });

      // Toast discreto (no máximo 1 a cada 4s) e somente para mudanças vindas
      // de outra origem (cliente público ou outro usuário interno).
      if (externalChangeRef.current) {
        externalChangeRef.current = false;
        const now = Date.now();
        if (now - lastToastAtRef.current > 4000) {
          lastToastAtRef.current = now;
          sonnerToast.info('Novas informações recebidas', {
            description: 'O card foi atualizado automaticamente.',
            duration: 2500,
          });
        }
      }
    };

    const schedule = (isExternal: boolean) => {
      if (isExternal) externalChangeRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Debounce 700ms: agrupa rajadas (várias inserções de documentos seguidas).
      debounceRef.current = setTimeout(flush, 700);
    };

    const isOwnEvent = (row: any): boolean => {
      if (!currentUserId || !row) return false;
      return (
        row.actor_user_id === currentUserId ||
        row.uploaded_by === currentUserId ||
        row.user_id === currentUserId ||
        row.requested_by === currentUserId
      );
    };

    const channel = supabase.channel(`open-card-${cardId}`);

    // cards: filtro direto pelo id
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cards', filter: `id=eq.${cardId}` },
      (payload) => schedule(!isOwnEvent(payload.new || payload.old)),
    );

    // card_activity_logs / comments / proposal_documents / proposal_parties:
    // filtros por card_id
    const cardScopedTables = [
      'card_activity_logs',
      'comments',
      'proposal_documents',
      'proposal_parties',
    ];
    cardScopedTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `card_id=eq.${cardId}` },
        (payload) => schedule(!isOwnEvent(payload.new || payload.old)),
      );
    });

    // Versão por proposal_link_id (uploads progressivos antes do card_id ser
    // gravado no documento, ou parties que ainda não têm card_id).
    if (proposalLinkId) {
      ['proposal_documents', 'proposal_parties'].forEach((table) => {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `proposal_link_id=eq.${proposalLinkId}`,
          },
          (payload) => schedule(!isOwnEvent(payload.new || payload.old)),
        );
      });

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_links',
          filter: `id=eq.${proposalLinkId}`,
        },
        (payload) => schedule(!isOwnEvent(payload.new || payload.old)),
      );

      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposal_correction_requests',
          filter: `proposal_link_id=eq.${proposalLinkId}`,
        },
        (payload) => schedule(!isOwnEvent(payload.new || payload.old)),
      );
    }

    channel.subscribe();

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      externalChangeRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [enabled, cardId, proposalLinkId, currentUserId, qc]);
}
