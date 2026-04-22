-- Create function to get board productivity report
CREATE OR REPLACE FUNCTION public.get_board_productivity_report(
  _board_id uuid DEFAULT NULL,
  _start_date timestamp with time zone DEFAULT NULL,
  _end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  board_id uuid,
  board_name text,
  month timestamp with time zone,
  cards_created bigint,
  cards_completed bigint,
  cards_in_progress bigint,
  avg_completion_hours numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH card_stats AS (
    SELECT 
      c.created_by,
      c.board_id,
      b.name as board_name,
      DATE_TRUNC('month', c.created_at) as month,
      COUNT(*) as total_cards,
      COUNT(*) FILTER (WHERE c.is_archived = true) as archived_cards,
      COUNT(*) FILTER (WHERE c.is_archived = false) as active_cards,
      -- Get cards in the last column (completed)
      COUNT(*) FILTER (
        WHERE c.column_id IN (
          SELECT col.id FROM columns col 
          WHERE col.board_id = c.board_id 
          ORDER BY col.position DESC 
          LIMIT 1
        )
      ) as completed_cards,
      -- Average time to completion (from created_at to archived_at or when moved to last column)
      AVG(
        EXTRACT(EPOCH FROM (COALESCE(c.archived_at, c.updated_at) - c.created_at)) / 3600
      ) FILTER (
        WHERE c.is_archived = true OR c.column_id IN (
          SELECT col.id FROM columns col 
          WHERE col.board_id = c.board_id 
          ORDER BY col.position DESC 
          LIMIT 1
        )
      ) as avg_hours
    FROM cards c
    JOIN boards b ON b.id = c.board_id
    WHERE 
      c.created_by IS NOT NULL
      AND (_board_id IS NULL OR c.board_id = _board_id)
      AND (_start_date IS NULL OR c.created_at >= _start_date)
      AND (_end_date IS NULL OR c.created_at <= _end_date)
    GROUP BY c.created_by, c.board_id, b.name, DATE_TRUNC('month', c.created_at)
  )
  SELECT 
    cs.created_by as user_id,
    p.full_name as user_name,
    cs.board_id,
    cs.board_name,
    cs.month,
    cs.total_cards as cards_created,
    cs.completed_cards as cards_completed,
    cs.active_cards - cs.completed_cards as cards_in_progress,
    ROUND(cs.avg_hours::numeric, 2) as avg_completion_hours
  FROM card_stats cs
  JOIN profiles p ON p.user_id = cs.created_by
  ORDER BY cs.month DESC, p.full_name, cs.board_name
$$;