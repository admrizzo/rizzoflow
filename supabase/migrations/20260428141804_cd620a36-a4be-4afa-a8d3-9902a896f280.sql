
-- 1) Policy de INSERT para cards vinculados a uma proposta:
--    qualquer membro operacional (admin, gestor, administrativo, editor, corretor)
--    pode criar um card desde que ele esteja vinculado a um proposal_link.
--    Cards "comuns" (sem proposta) seguem restritos a admin/editor.
CREATE POLICY "Operacional pode criar cards de propostas"
ON public.cards
FOR INSERT
TO authenticated
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'corretor'::app_role)
  )
);

-- 2) Policy de UPDATE para cards de propostas (somente dentro do escopo via can_view_card)
CREATE POLICY "Operacional pode atualizar cards de propostas"
ON public.cards
FOR UPDATE
TO authenticated
USING (
  proposal_link_id IS NOT NULL
  AND can_view_card(auth.uid(), id)
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'corretor'::app_role)
  )
)
WITH CHECK (
  proposal_link_id IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
    OR has_role(auth.uid(), 'administrativo'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'corretor'::app_role)
  )
);

-- 3) Backfill: criar cards faltantes para proposal_links sem card vinculado.
--    Usa a coluna "Cadastro iniciado" do fluxo de Locação.
DO $$
DECLARE
  v_locacao_board_id uuid;
  v_cadastro_iniciado_col_id uuid;
  v_link record;
  v_next_position integer;
BEGIN
  SELECT id INTO v_locacao_board_id
  FROM public.boards
  WHERE is_active = true AND lower(name) LIKE '%loca%'
  ORDER BY position
  LIMIT 1;

  IF v_locacao_board_id IS NULL THEN
    RAISE NOTICE 'Backfill abortado: board de Locação não encontrado';
    RETURN;
  END IF;

  SELECT id INTO v_cadastro_iniciado_col_id
  FROM public.columns
  WHERE board_id = v_locacao_board_id
    AND lower(name) LIKE '%cadastro iniciado%'
  ORDER BY position
  LIMIT 1;

  IF v_cadastro_iniciado_col_id IS NULL THEN
    SELECT id INTO v_cadastro_iniciado_col_id
    FROM public.columns
    WHERE board_id = v_locacao_board_id
    ORDER BY position
    LIMIT 1;
  END IF;

  FOR v_link IN
    SELECT pl.*
    FROM public.proposal_links pl
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cards c WHERE c.proposal_link_id = pl.id
    )
  LOOP
    SELECT COALESCE(MAX(position), -1) + 1
    INTO v_next_position
    FROM public.cards
    WHERE column_id = v_cadastro_iniciado_col_id
      AND is_archived = false;

    INSERT INTO public.cards (
      title,
      board_id,
      column_id,
      robust_code,
      building_name,
      address,
      proposal_responsible,
      proposal_link_id,
      description,
      created_by,
      position,
      column_entered_at
    ) VALUES (
      COALESCE(v_link.codigo_robust::text, '') || ' - ' || COALESCE(v_link.property_name, 'Proposta'),
      v_locacao_board_id,
      v_cadastro_iniciado_col_id,
      v_link.codigo_robust::text,
      v_link.property_name,
      v_link.address_summary,
      v_link.broker_name,
      v_link.id,
      'Card recriado automaticamente (backfill) — proposta gerada em ' ||
        to_char(v_link.created_at, 'DD/MM/YYYY HH24:MI'),
      v_link.created_by,
      v_next_position,
      v_link.created_at
    );
  END LOOP;
END $$;
