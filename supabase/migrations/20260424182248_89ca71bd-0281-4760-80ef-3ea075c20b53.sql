-- 1. Backfill de profiles para usuários do auth.users que ainda não têm profile
INSERT INTO public.profiles (user_id, full_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 2. RPC para listar usuários internos (auth.users + profile + role)
-- Apenas admin pode chamar
CREATE OR REPLACE FUNCTION public.list_internal_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  department text,
  role app_role,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admins podem listar usuários internos
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
    u.created_at AS created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.created_at ASC;
END;
$$;

-- 3. RPC para alterar role de um usuário, com proteção contra remover o último admin
CREATE OR REPLACE FUNCTION public.set_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count integer;
  v_target_is_admin boolean;
BEGIN
  -- Apenas admins podem alterar roles
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar papéis';
  END IF;

  -- Verificar se o usuário alvo é atualmente admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role
  ) INTO v_target_is_admin;

  -- Se está rebaixando um admin, garantir que não é o último
  IF v_target_is_admin AND _role <> 'admin'::app_role THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador do sistema';
    END IF;
  END IF;

  -- Garantir que existe profile (defesa em profundidade)
  INSERT INTO public.profiles (user_id, full_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = _user_id
  ON CONFLICT (user_id) DO NOTHING;

  -- Remover roles antigos e definir o novo
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

-- 4. RPC para remover role (com mesma proteção)
CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count integer;
  v_target_is_admin boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover papéis';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::app_role
  ) INTO v_target_is_admin;

  IF v_target_is_admin THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o último administrador do sistema';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
END;
$$;

-- 5. Garantir que profiles.user_id é único (necessário para o ON CONFLICT acima)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 6. Permitir EXECUTE nas funções para usuários autenticados (a checagem de admin acontece dentro)
GRANT EXECUTE ON FUNCTION public.list_internal_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role(uuid) TO authenticated;