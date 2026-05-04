-- 1. Adicionar colunas necessárias
ALTER TABLE public.proposal_links 
ADD COLUMN IF NOT EXISTS proposal_sequence integer,
ADD COLUMN IF NOT EXISTS proposal_display_code text;

ALTER TABLE public.cards
ADD COLUMN IF NOT EXISTS proposal_display_code text;

-- 2. Criar função para gerar sequência e código de exibição
CREATE OR REPLACE FUNCTION public.generate_proposal_display_code()
RETURNS TRIGGER AS $$
DECLARE
    v_max_seq integer;
BEGIN
    -- Calcula a próxima sequência para este codigo_robust
    SELECT COALESCE(MAX(proposal_sequence), 0) + 1
    INTO v_max_seq
    FROM public.proposal_links
    WHERE codigo_robust = NEW.codigo_robust;

    NEW.proposal_sequence := v_max_seq;
    -- Formato: LOC-{codigo_robust}-P01, P02...
    NEW.proposal_display_code := 'LOC-' || NEW.codigo_robust || '-P' || LPAD(v_max_seq::text, 2, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger na tabela proposal_links
DROP TRIGGER IF EXISTS tr_generate_proposal_display_code ON public.proposal_links;
CREATE TRIGGER tr_generate_proposal_display_code
BEFORE INSERT ON public.proposal_links
FOR EACH ROW
EXECUTE FUNCTION public.generate_proposal_display_code();

-- 4. Backfill para links de proposta existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        WITH numbered_links AS (
            SELECT 
                id,
                codigo_robust,
                row_number() OVER (PARTITION BY codigo_robust ORDER BY created_at ASC) as seq
            FROM public.proposal_links
        )
        SELECT * FROM numbered_links
    LOOP
        UPDATE public.proposal_links 
        SET 
            proposal_sequence = r.seq,
            proposal_display_code = 'LOC-' || codigo_robust || '-P' || LPAD(r.seq::text, 2, '0')
        WHERE id = r.id;
    END LOOP;
END $$;

-- 5. Atualizar cards existentes vinculados a links de proposta
UPDATE public.cards c
SET proposal_display_code = pl.proposal_display_code
FROM public.proposal_links pl
WHERE c.proposal_link_id = pl.id
AND c.proposal_display_code IS NULL;

-- 6. Atualizar finalize_public_proposal para incluir o proposal_display_code
CREATE OR REPLACE FUNCTION public.finalize_public_proposal(_public_token uuid, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_link               public.proposal_links%ROWTYPE;
  v_card_id            uuid;
  v_card_board_id      uuid;
  v_card_column_id     uuid;
  v_locacao_board_id   uuid;
  v_cadastro_col_id    uuid;
  v_aguardando_col_id  uuid;
  v_next_position      integer;
  v_should_move        boolean := false;
  v_title              text;
  v_description        text;
  v_address            text;
  v_robust_code        text;
  v_building_name      text;
  v_guarantee_type     text;
  v_contract_type      text;
  v_proposal_resp      text;
  v_negotiation        text;
  v_client_name        text;
  v_imovel_codigo      text;
  v_card_was_created   boolean := false;
BEGIN
  IF _public_token IS NULL THEN
    RAISE EXCEPTION 'public_token obrigatório';
  END IF;

  SELECT * INTO v_link
  FROM public.proposal_links
  WHERE public_token = _public_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada para este link';
  END IF;

  v_title          := COALESCE(_payload->>'title', v_link.property_name, v_link.codigo_robust::text);
  v_description    := _payload->>'description';
  v_address        := COALESCE(_payload->>'address', v_link.address_summary);
  v_robust_code    := COALESCE(_payload->>'robust_code', v_link.codigo_robust::text);
  v_building_name  := COALESCE(_payload->>'building_name', v_link.property_name);
  v_guarantee_type := _payload->>'guarantee_type';
  v_contract_type  := _payload->>'contract_type';
  v_proposal_resp  := COALESCE(_payload->>'proposal_responsible', v_link.broker_name);
  v_negotiation    := _payload->>'negotiation_details';
  v_client_name    := _payload->>'client_name';
  v_imovel_codigo  := COALESCE(_payload->>'imovel_codigo', v_link.codigo_robust::text);

  -- Busca o board de locação
  SELECT id INTO v_locacao_board_id
  FROM public.boards
  WHERE is_active = true AND lower(name) LIKE '%loca%'
  ORDER BY position
  LIMIT 1;

  IF v_locacao_board_id IS NULL THEN
    RAISE EXCEPTION 'Board de Locação não encontrado';
  END IF;

  -- Busca a coluna inicial (fallback para criação)
  SELECT id INTO v_cadastro_col_id
  FROM public.columns
  WHERE board_id = v_locacao_board_id
    AND lower(name) LIKE '%cadastro iniciado%'
  ORDER BY position LIMIT 1;

  IF v_cadastro_col_id IS NULL THEN
    SELECT id INTO v_cadastro_col_id
    FROM public.columns WHERE board_id = v_locacao_board_id
    ORDER BY position LIMIT 1;
  END IF;

  -- Busca a coluna de destino conforme prioridade solicitada
  SELECT id INTO v_aguardando_col_id
  FROM public.columns
  WHERE board_id = v_locacao_board_id
    AND lower(translate(name, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')) IN (
      'documentacao enviada',
      'documentos enviados',
      'documentacao recebida',
      'docs recebidos',
      'aguardando documentacao',
      'analise documental'
    )
  ORDER BY (
    CASE lower(translate(name, 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'))
      WHEN 'documentacao enviada' THEN 1
      WHEN 'documentos enviados' THEN 2
      WHEN 'documentacao recebida' THEN 3
      WHEN 'docs recebidos' THEN 4
      WHEN 'aguardando documentacao' THEN 5
      WHEN 'analise documental' THEN 6
      ELSE 7
    END
  ), position ASC
  LIMIT 1;

  -- Verifica se já existe um card para este link
  SELECT id, board_id, column_id
  INTO v_card_id, v_card_board_id, v_card_column_id
  FROM public.cards
  WHERE proposal_link_id = v_link.id
    AND is_archived = false
  ORDER BY created_at ASC
  LIMIT 1;

  v_should_move := v_aguardando_col_id IS NOT NULL
                   AND v_card_column_id IS DISTINCT FROM v_aguardando_col_id;

  IF v_card_id IS NULL THEN
    -- Criar novo card
    SELECT COALESCE(MAX(position), -1) + 1
    INTO v_next_position
    FROM public.cards
    WHERE column_id = COALESCE(v_aguardando_col_id, v_cadastro_col_id) AND is_archived = false;

    INSERT INTO public.cards (
      title, description, address, robust_code, building_name,
      guarantee_type, contract_type,
      proposal_responsible, negotiation_details,
      board_id, column_id, position,
      proposal_link_id, proposal_submitted_at,
      created_by, column_entered_at,
      proposal_display_code
    ) VALUES (
      v_title, v_description, v_address, v_robust_code, v_building_name,
      NULLIF(v_guarantee_type,'')::guarantee_type,
      NULLIF(v_contract_type,'')::contract_type,
      v_proposal_resp, v_negotiation,
      v_locacao_board_id, COALESCE(v_aguardando_col_id, v_cadastro_col_id), v_next_position,
      v_link.id, now(),
      v_link.created_by, now(),
      v_link.proposal_display_code
    ) RETURNING id INTO v_card_id;

    v_card_was_created := true;
  ELSE
    -- Atualizar card existente
    UPDATE public.cards SET
      proposal_submitted_at = now(),
      proposal_display_code = v_link.proposal_display_code,
      column_id = CASE WHEN v_should_move THEN v_aguardando_col_id ELSE column_id END,
      column_entered_at = CASE WHEN v_should_move THEN now() ELSE column_entered_at END,
      last_moved_at = CASE WHEN v_should_move THEN now() ELSE last_moved_at END
    WHERE id = v_card_id;
  END IF;

  -- Aplica templates de checklist ativos para o card
  PERFORM public.apply_active_checklist_templates(v_card_id);

  -- Atualiza o status do link
  UPDATE public.proposal_links
  SET status = 'enviada'
  WHERE id = v_link.id;

  -- Log de recebimento
  INSERT INTO public.card_activity_logs (
    card_id, actor_user_id, event_type, title, description, metadata
  ) VALUES (
    v_card_id, NULL, 'proposal_submitted',
    '📬 Documentos/proposta recebidos pelo cliente',
    COALESCE(v_client_name, 'Cliente') || ' enviou a proposta para o imóvel ' || COALESCE(v_imovel_codigo,''),
    jsonb_build_object(
      'proposal_link_id', v_link.id,
      'broker_name', v_link.broker_name,
      'client_name', v_client_name
    )
  );

  -- Log de movimentação automática (se houve)
  IF v_should_move THEN
    INSERT INTO public.card_activity_logs (
      card_id, actor_user_id, event_type, title, description, metadata
    )
    SELECT
      v_card_id, NULL, 'auto_column_move',
      '➡️ Movido para ' || name,
      'Card movido automaticamente após recebimento da proposta.',
      jsonb_build_object(
        'from_column_id', v_card_column_id,
        'to_column_id',   v_aguardando_col_id,
        'reason', 'proposal_submitted'
      )
    FROM public.columns WHERE id = v_aguardando_col_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'card_id', v_card_id,
    'proposal_link_id', v_link.id,
    'moved', v_should_move,
    'card_created', v_card_was_created
  );
END;
$function$;
