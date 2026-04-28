import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook centralizado de Realtime para o Rizzo Flow.
 *
 * Assina mudanças nas principais tabelas operacionais e invalida as
 * queryKeys relevantes do React Query, com debounce para agrupar rajadas
 * de eventos. RLS continua sendo respeitada — o realtime apenas dispara
 * o refetch; o banco devolve só o que o usuário pode ver.
 *
 * Deve ser ativado UMA ÚNICA VEZ na área autenticada (Dashboard).
 */

type TableSpec = {
  table: string;
  // queryKeys do React Query a invalidar quando essa tabela mudar
  keys: string[];
};

const TABLES: TableSpec[] = [
  // Cards e movimentação
  { table: 'cards', keys: ['cards', 'my-queue', 'card-counts', 'archived-count', 'card-detail-from-queue'] },
  { table: 'columns', keys: ['columns'] },
  { table: 'boards', keys: ['boards', 'admin-boards'] },

  // Propostas e documentos
  { table: 'proposal_links', keys: ['proposal-links', 'cards', 'my-queue'] },
  { table: 'proposal_documents', keys: ['proposal-documents', 'cards', 'my-queue'] },

  // Histórico, comentários e menções
  { table: 'card_activity_logs', keys: ['card-activity-logs'] },
  { table: 'comments', keys: ['comments'] },
  { table: 'comment_mentions', keys: ['mentions', 'notifications'] },
  { table: 'notifications', keys: ['notifications'] },

  // Checklists
  { table: 'checklists', keys: ['checklists', 'cards', 'my-queue'] },
  { table: 'checklist_items', keys: ['checklists', 'cards', 'my-queue'] },

  // Vínculos do card
  { table: 'card_members', keys: ['cards'] },
  { table: 'card_labels', keys: ['cards'] },

  // Permissões / acessos
  { table: 'user_boards', keys: ['boards', 'user-boards', 'my-user-boards', 'admin-boards', 'internal-users'] },
  { table: 'user_roles', keys: ['user-roles', 'internal-users', 'permissions'] },
];

export function useOperationalRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const flush = () => {
      const keys = Array.from(pendingRef.current);
      pendingRef.current.clear();
      timerRef.current = null;
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    };

    const schedule = (keys: string[]) => {
      keys.forEach((k) => pendingRef.current.add(k));
      if (timerRef.current) clearTimeout(timerRef.current);
      // Debounce de ~500ms para agrupar rajadas (faixa 300–800ms).
      timerRef.current = setTimeout(flush, 500);
    };

    const channel = supabase.channel(`operational-realtime-${user.id}`);

    TABLES.forEach(({ table, keys }) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => schedule(keys),
      );
    });

    channel.subscribe();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current.clear();
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
