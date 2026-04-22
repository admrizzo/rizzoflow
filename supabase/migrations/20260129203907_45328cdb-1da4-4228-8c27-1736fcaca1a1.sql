-- Create function to get user interaction ranking
CREATE OR REPLACE FUNCTION public.get_user_interaction_ranking(
  _board_id uuid DEFAULT NULL,
  _start_date timestamp with time zone DEFAULT NULL,
  _end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  checklist_completions bigint,
  comments_count bigint,
  card_moves bigint,
  total_interactions bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH checklist_stats AS (
    SELECT 
      ci.completed_by as user_id,
      COUNT(*) as completions
    FROM checklist_items ci
    JOIN checklists cl ON cl.id = ci.checklist_id
    JOIN cards c ON c.id = cl.card_id
    WHERE ci.completed_by IS NOT NULL
      AND ci.is_completed = true
      AND (_board_id IS NULL OR c.board_id = _board_id)
      AND (_start_date IS NULL OR ci.completed_at >= _start_date)
      AND (_end_date IS NULL OR ci.completed_at <= _end_date)
    GROUP BY ci.completed_by
  ),
  comment_stats AS (
    SELECT 
      co.user_id,
      COUNT(*) as comments
    FROM comments co
    JOIN cards c ON c.id = co.card_id
    WHERE co.user_id IS NOT NULL
      AND (_board_id IS NULL OR c.board_id = _board_id)
      AND (_start_date IS NULL OR co.created_at >= _start_date)
      AND (_end_date IS NULL OR co.created_at <= _end_date)
    GROUP BY co.user_id
  ),
  card_activity_stats AS (
    SELECT 
      c.created_by as user_id,
      COUNT(*) as moves
    FROM cards c
    WHERE c.created_by IS NOT NULL
      AND c.updated_at > c.created_at
      AND (_board_id IS NULL OR c.board_id = _board_id)
      AND (_start_date IS NULL OR c.updated_at >= _start_date)
      AND (_end_date IS NULL OR c.updated_at <= _end_date)
    GROUP BY c.created_by
  )
  SELECT 
    p.user_id,
    p.full_name as user_name,
    COALESCE(cs.completions, 0) as checklist_completions,
    COALESCE(cos.comments, 0) as comments_count,
    COALESCE(cas.moves, 0) as card_moves,
    (COALESCE(cs.completions, 0) + COALESCE(cos.comments, 0) + COALESCE(cas.moves, 0)) as total_interactions
  FROM profiles p
  LEFT JOIN checklist_stats cs ON cs.user_id = p.user_id
  LEFT JOIN comment_stats cos ON cos.user_id = p.user_id
  LEFT JOIN card_activity_stats cas ON cas.user_id = p.user_id
  WHERE (cs.completions IS NOT NULL OR cos.comments IS NOT NULL OR cas.moves IS NOT NULL)
  ORDER BY total_interactions DESC;
$$;