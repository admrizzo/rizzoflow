CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cards c
    LEFT JOIN public.board_config bc ON bc.board_id = c.board_id
    WHERE c.id = _card_id
      AND (
        -- 1) Admin vê tudo
        has_role(_user_id, 'admin'::app_role)

        -- 2) Gestor / Administrativo / Editor (legado):
        --    veem cards dos fluxos aos quais têm acesso,
        --    respeitando owner_only_visibility quando ativo.
        OR (
          (
            has_role(_user_id, 'gestor'::app_role)
            OR has_role(_user_id, 'administrativo'::app_role)
            OR has_role(_user_id, 'editor'::app_role)
          )
          AND has_board_access(_user_id, c.board_id)
          AND (
            COALESCE(bc.owner_only_visibility, false) = false
            OR c.created_by = _user_id
          )
        )

        -- 3) Corretor: escopo restrito.
        --    Só vê cards onde ele é criador, responsável,
        --    ou vinculado via proposta (broker_user_id).
        OR (
          has_role(_user_id, 'corretor'::app_role)
          AND (
            c.created_by = _user_id
            OR c.responsible_user_id = _user_id
            OR EXISTS (
              SELECT 1
              FROM public.proposal_links pl
              WHERE pl.id = c.proposal_link_id
                AND pl.broker_user_id = _user_id
            )
          )
        )
      )
  )
$function$;