
DROP FUNCTION IF EXISTS public.get_my_queue();

CREATE OR REPLACE FUNCTION public.get_my_queue()
 RETURNS TABLE(id uuid, card_number integer, title text, board_id uuid, board_name text, column_id uuid, column_name text, next_action text, next_action_due_date timestamp with time zone, responsible_user_id uuid, responsible_name text, created_by uuid, column_entered_at timestamp with time zone, checklist_total bigint, checklist_done bigint, checklist_open_doc_items bigint, is_overdue boolean, is_due_today boolean, has_no_due_date boolean, has_no_responsible boolean, is_waiting_client boolean, proposal_submitted_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH visible_cards AS (
    SELECT
      c.id, c.card_number, c.title, c.board_id, c.column_id,
      c.next_action, c.next_action_due_date, c.responsible_user_id,
      c.created_by, c.column_entered_at, c.proposal_submitted_at
    FROM public.cards c
    WHERE c.is_archived = false
  ),
  checklist_stats AS (
    SELECT
      cl.card_id,
      COUNT(*) FILTER (WHERE COALESCE(ci.is_dismissed, false) = false) AS total_active,
      COUNT(*) FILTER (WHERE COALESCE(ci.is_dismissed, false) = false AND ci.is_completed = true) AS done_active,
      COUNT(*) FILTER (
        WHERE COALESCE(ci.is_dismissed, false) = false
          AND ci.is_completed = false
          AND (lower(ci.content) LIKE '%document%'
               OR lower(ci.content) LIKE '%doc.%'
               OR lower(ci.content) LIKE '%docto%'
               OR lower(ci.content) LIKE '%docs%')
      ) AS open_doc_items
    FROM public.checklists cl
    JOIN public.checklist_items ci ON ci.checklist_id = cl.id
    WHERE cl.card_id IN (SELECT id FROM visible_cards)
    GROUP BY cl.card_id
  )
  SELECT
    vc.id, vc.card_number, vc.title, vc.board_id, b.name AS board_name,
    vc.column_id, col.name AS column_name, vc.next_action, vc.next_action_due_date,
    vc.responsible_user_id, p.full_name AS responsible_name, vc.created_by, vc.column_entered_at,
    COALESCE(cs.total_active, 0) AS checklist_total,
    COALESCE(cs.done_active, 0) AS checklist_done,
    COALESCE(cs.open_doc_items, 0) AS checklist_open_doc_items,
    (vc.next_action_due_date IS NOT NULL AND vc.next_action_due_date < now()) AS is_overdue,
    (vc.next_action_due_date IS NOT NULL AND (vc.next_action_due_date AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date) AS is_due_today,
    (vc.next_action_due_date IS NULL) AS has_no_due_date,
    (vc.responsible_user_id IS NULL) AS has_no_responsible,
    (col.name IS NOT NULL AND (
      lower(col.name) LIKE '%aguardando%'
      OR lower(col.name) LIKE '%cliente%'
      OR lower(col.name) LIKE '%documenta%'
    )) AS is_waiting_client,
    vc.proposal_submitted_at
  FROM visible_cards vc
  LEFT JOIN public.boards b ON b.id = vc.board_id
  LEFT JOIN public.columns col ON col.id = vc.column_id
  LEFT JOIN public.profiles p ON p.user_id = vc.responsible_user_id
  LEFT JOIN checklist_stats cs ON cs.card_id = vc.id
  ORDER BY
    CASE
      WHEN vc.next_action_due_date IS NOT NULL AND vc.next_action_due_date < now() THEN 0
      WHEN vc.next_action_due_date IS NOT NULL AND (vc.next_action_due_date AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN 1
      WHEN vc.responsible_user_id IS NULL THEN 2
      WHEN vc.next_action_due_date IS NULL THEN 3
      ELSE 4
    END,
    vc.column_entered_at NULLS LAST;
$function$;
