-- 1) Função: garante que corretor tenha acesso ao fluxo "Fluxo de Locação"
CREATE OR REPLACE FUNCTION public.grant_locacao_access_to_corretor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locacao_board_id uuid;
BEGIN
  IF NEW.role = 'corretor'::app_role THEN
    -- Localiza o board de locação (preferindo nome com "loca")
    SELECT id INTO v_locacao_board_id
    FROM public.boards
    WHERE is_active = true
      AND lower(name) LIKE '%loca%'
    ORDER BY position
    LIMIT 1;

    IF v_locacao_board_id IS NOT NULL THEN
      INSERT INTO public.user_boards (user_id, board_id, is_board_admin)
      VALUES (NEW.user_id, v_locacao_board_id, false)
      ON CONFLICT (user_id, board_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Garante unique constraint para suportar ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_boards_user_id_board_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.user_boards
        ADD CONSTRAINT user_boards_user_id_board_id_key UNIQUE (user_id, board_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- 3) Trigger ao inserir role
DROP TRIGGER IF EXISTS trg_grant_locacao_on_role_insert ON public.user_roles;
CREATE TRIGGER trg_grant_locacao_on_role_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.grant_locacao_access_to_corretor();

-- 4) Backfill: para todo corretor existente sem acesso ao Locação, conceder
DO $$
DECLARE
  v_locacao_board_id uuid;
BEGIN
  SELECT id INTO v_locacao_board_id
  FROM public.boards
  WHERE is_active = true AND lower(name) LIKE '%loca%'
  ORDER BY position
  LIMIT 1;

  IF v_locacao_board_id IS NOT NULL THEN
    INSERT INTO public.user_boards (user_id, board_id, is_board_admin)
    SELECT ur.user_id, v_locacao_board_id, false
    FROM public.user_roles ur
    WHERE ur.role = 'corretor'::app_role
    ON CONFLICT (user_id, board_id) DO NOTHING;
  END IF;
END $$;

-- 5) Habilita realtime em user_boards e user_roles para o usuário receber updates
ALTER TABLE public.user_boards REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_boards;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;