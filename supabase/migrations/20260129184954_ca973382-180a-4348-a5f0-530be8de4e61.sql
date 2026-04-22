-- Drop the SECURITY DEFINER view and recreate as a regular function
DROP VIEW IF EXISTS public.admin_productivity_report;

-- Create a secure function for productivity reports instead
CREATE OR REPLACE FUNCTION public.get_admin_productivity_report(
  _start_date TIMESTAMPTZ DEFAULT NULL,
  _end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  month TIMESTAMPTZ,
  category admin_task_category,
  completed_count BIGINT,
  in_progress_count BIGINT,
  cancelled_count BIGINT,
  total_count BIGINT,
  completion_rate NUMERIC,
  avg_completion_minutes NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    ac.user_id,
    p.full_name as user_name,
    DATE_TRUNC('month', ac.started_at) as month,
    ac.category,
    COUNT(*) FILTER (WHERE ac.status = 'concluido') as completed_count,
    COUNT(*) FILTER (WHERE ac.status = 'em_andamento') as in_progress_count,
    COUNT(*) FILTER (WHERE ac.status = 'cancelado') as cancelled_count,
    COUNT(*) as total_count,
    ROUND(
      (COUNT(*) FILTER (WHERE ac.status = 'concluido')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 
      2
    ) as completion_rate,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (ac.completed_at - ac.started_at)) / 60
      ) FILTER (WHERE ac.status = 'concluido'),
      2
    ) as avg_completion_minutes
  FROM public.admin_cards ac
  JOIN public.profiles p ON p.user_id = ac.user_id
  WHERE 
    (_start_date IS NULL OR ac.started_at >= _start_date)
    AND (_end_date IS NULL OR ac.started_at <= _end_date)
  GROUP BY ac.user_id, p.full_name, DATE_TRUNC('month', ac.started_at), ac.category
  ORDER BY month DESC, user_name, category
$$;