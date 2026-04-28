import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { perfMark, perfMeasure } from '@/lib/perfMark';

/**
 * Item da fila operacional ("Minha Fila").
 * Combina o card com a coluna, board, responsável, checklists e algumas flags
 * derivadas para classificação rápida na UI.
 */
export interface QueueItem {
  id: string;
  card_number: number;
  title: string;
  board_id: string | null;
  board_name: string | null;
  column_id: string | null;
  column_name: string | null;
  next_action: string | null;
  next_action_due_date: string | null;
  responsible_user_id: string | null;
  responsible_name: string | null;
  created_by: string | null;
  column_entered_at: string | null;
  // Checklist agregado (todas as listas do card)
  checklist_total: number;
  checklist_done: number;
  checklist_open_doc_items: number; // itens em aberto cujo conteúdo cita "document"
  // Flags derivadas para filtros
  is_overdue: boolean;
  is_due_today: boolean;
  has_no_due_date: boolean;
  has_no_responsible: boolean;
  is_waiting_client: boolean;
  /** Quando o cliente enviou a proposta pública. Quando preenchido, a UI exibe "Doc. recebidos". */
  proposal_submitted_at: string | null;
}

/**
 * Carrega a fila operacional via RPC `get_my_queue` no Postgres.
 *
 * - Visibilidade respeita as RLS de `cards` (SECURITY INVOKER):
 *   admin vê tudo, gestor/administrativo veem cards dos fluxos com acesso,
 *   corretor só vê os próprios.
 * - Toda a agregação (contadores de checklist, flags de prazo, ordenação)
 *   é feita no banco, em uma única chamada, sem trazer relações pesadas.
 */
export function useMyQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-queue', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<QueueItem[]> => {
      perfMark('minha-fila:fetch:start');
      const { data, error } = await supabase.rpc('get_my_queue');
      if (error) throw error;
      perfMeasure('minha-fila:fetch', 'minha-fila:fetch:start');

      // A RPC já retorna no formato esperado pela UI; só normalizamos números (bigint -> number).
      const items: QueueItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        card_number: row.card_number,
        title: row.title,
        board_id: row.board_id,
        board_name: row.board_name,
        column_id: row.column_id,
        column_name: row.column_name,
        next_action: row.next_action,
        next_action_due_date: row.next_action_due_date,
        responsible_user_id: row.responsible_user_id,
        responsible_name: row.responsible_name,
        created_by: row.created_by,
        column_entered_at: row.column_entered_at,
        checklist_total: Number(row.checklist_total ?? 0),
        checklist_done: Number(row.checklist_done ?? 0),
        checklist_open_doc_items: Number(row.checklist_open_doc_items ?? 0),
        is_overdue: !!row.is_overdue,
        is_due_today: !!row.is_due_today,
        has_no_due_date: !!row.has_no_due_date,
        has_no_responsible: !!row.has_no_responsible,
        is_waiting_client: !!row.is_waiting_client,
        proposal_submitted_at: row.proposal_submitted_at ?? null,
      }));

      return items;
    },
  });
}
