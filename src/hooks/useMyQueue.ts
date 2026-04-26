import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

const WAITING_CLIENT_KEYWORDS = ['aguardando', 'cliente', 'documenta'];
const DOC_KEYWORDS = ['document', 'doc.', 'docto', 'docs'];

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Carrega a fila operacional respeitando o escopo do usuário via RLS:
 *  - admin: todos
 *  - gestor / administrativo: cards dos boards aos quais tem acesso
 *  - corretor: apenas cards próprios / atribuídos / vinculados via proposal_links
 *
 * O filtro real de visibilidade é feito pelas RLS no Postgres.
 * Aqui apenas pedimos os cards não arquivados e enriquecemos para a UI.
 */
export function useMyQueue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-queue', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<QueueItem[]> => {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id,
          card_number,
          title,
          board_id,
          column_id,
          next_action,
          next_action_due_date,
          responsible_user_id,
          created_by,
          column_entered_at,
          board:boards(id, name),
          column:columns(id, name),
          checklists(id, items:checklist_items(id, content, is_completed, is_dismissed))
        `)
        .eq('is_archived', false);

      if (error) throw error;

      const rows = data ?? [];

      // Buscar nomes dos responsáveis em uma única query
      const responsibleIds = Array.from(
        new Set(rows.map((r: any) => r.responsible_user_id).filter(Boolean) as string[]),
      );

      const profilesById: Record<string, string> = {};
      if (responsibleIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', responsibleIds);
        (profiles ?? []).forEach((p: any) => {
          profilesById[p.user_id] = p.full_name;
        });
      }

      const todayStart = startOfTodayISO().getTime();
      const todayEnd = endOfTodayISO().getTime();

      const items: QueueItem[] = rows.map((c: any) => {
        const allItems = (c.checklists ?? []).flatMap((cl: any) => cl.items ?? []);
        const activeItems = allItems.filter((it: any) => !it.is_dismissed);
        const doneItems = activeItems.filter((it: any) => it.is_completed);
        const openDocItems = activeItems.filter((it: any) => {
          if (it.is_completed) return false;
          const text = (it.content || '').toLowerCase();
          return DOC_KEYWORDS.some((k) => text.includes(k));
        });

        const dueRaw = c.next_action_due_date;
        let isOverdue = false;
        let isDueToday = false;
        if (dueRaw) {
          // next_action_due_date é DATE -> tratar no fuso local
          const due = new Date(dueRaw + 'T00:00:00');
          const dueTime = due.getTime();
          if (dueTime < todayStart) isOverdue = true;
          else if (dueTime >= todayStart && dueTime <= todayEnd) isDueToday = true;
        }

        const columnName: string | null = c.column?.name ?? null;
        const isWaitingClient = !!columnName
          && WAITING_CLIENT_KEYWORDS.some((k) => columnName.toLowerCase().includes(k));

        return {
          id: c.id,
          card_number: c.card_number,
          title: c.title,
          board_id: c.board_id,
          board_name: c.board?.name ?? null,
          column_id: c.column_id,
          column_name: columnName,
          next_action: c.next_action ?? null,
          next_action_due_date: dueRaw ?? null,
          responsible_user_id: c.responsible_user_id ?? null,
          responsible_name: c.responsible_user_id ? (profilesById[c.responsible_user_id] ?? null) : null,
          created_by: c.created_by ?? null,
          column_entered_at: c.column_entered_at ?? null,
          checklist_total: activeItems.length,
          checklist_done: doneItems.length,
          checklist_open_doc_items: openDocItems.length,
          is_overdue: isOverdue,
          is_due_today: isDueToday,
          has_no_due_date: !dueRaw,
          has_no_responsible: !c.responsible_user_id,
          is_waiting_client: isWaitingClient,
        };
      });

      // Ordenação: vencidos > hoje > sem responsável > sem prazo > parados há mais tempo > restante
      items.sort((a, b) => {
        const score = (it: QueueItem) => {
          if (it.is_overdue) return 0;
          if (it.is_due_today) return 1;
          if (it.has_no_responsible) return 2;
          if (it.has_no_due_date) return 3;
          return 4;
        };
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;

        // Dentro do mesmo grupo: mais antigo na coluna primeiro (parado há mais tempo)
        const ea = a.column_entered_at ? new Date(a.column_entered_at).getTime() : Infinity;
        const eb = b.column_entered_at ? new Date(b.column_entered_at).getTime() : Infinity;
        return ea - eb;
      });

      return items;
    },
  });
}
