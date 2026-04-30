
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Atualiza a RPC para incluir avatar_url e must_change_password
DROP FUNCTION IF EXISTS public.list_internal_users();

CREATE OR REPLACE FUNCTION public.list_internal_users()
 RETURNS TABLE(
    user_id uuid,
    email text,
    full_name text,
    department text,
    role app_role,
    created_at timestamp with time zone,
    avatar_url text,
    must_change_password boolean,
    last_sign_in_at timestamp with time zone
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text AS email,
    COALESCE(p.full_name, split_part(u.email, '@', 1))::text AS full_name,
    p.department::text AS department,
    ur.role AS role,
    u.created_at AS created_at,
    p.avatar_url::text AS avatar_url,
    COALESCE(p.must_change_password, false) AS must_change_password,
    u.last_sign_in_at AS last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at ASC;
END;
$function$;
