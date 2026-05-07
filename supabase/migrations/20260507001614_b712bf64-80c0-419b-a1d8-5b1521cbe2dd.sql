-- Drop existing function to recreate it with the correct logic
DROP FUNCTION IF EXISTS public.finalize_public_proposal(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.finalize_public_proposal(_public_token uuid, _payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_link               public.proposal_links%ROWTYPE;
    v_card_id            uuid;
    v_locacao_board_id   uuid;
    v_cadastro_col_id    uuid;
    v_docs_enviada_col_id uuid;
    v_fallback_col_id    uuid;
    v_next_position      integer;
    v_title              text;
    v_existing_title     text;
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
    v_property_info      text;
    v_docs_obs           text;
    v_draft_data         jsonb;
    v_correction_request_id uuid;
    v_correction_message    text;
    v_correction_sections   jsonb;
    v_correction_only_docs  boolean DEFAULT false;
    v_correction_responded  boolean DEFAULT false;
    v_activity_exists       boolean;
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

    -- Tenta pegar nome do cliente do payload
    v_client_name    := _payload->>'client_name';
    v_imovel_codigo  := COALESCE(_payload->>'imovel_codigo', v_link.codigo_robust::text);
    v_building_name  := COALESCE(_payload->>'building_name', v_link.property_name);
    v_property_info  := COALESCE(v_building_name, v_imovel_codigo);
    v_docs_obs       := _payload->>'documentos_observacao';

    -- Se não veio no payload, busca na proposal_drafts
    IF v_client_name IS NULL OR v_client_name = '' OR v_client_name = 'Não informado' THEN
      SELECT form_data INTO v_draft_data
      FROM public.proposal_drafts
      WHERE proposal_link_id = v_link.id
      ORDER BY updated_at DESC
      LIMIT 1;

      IF v_draft_data IS NOT NULL THEN
        v_client_name := COALESCE(
          v_draft_data->'empresa'->>'razao_social',
          v_draft_data->'dados_pessoais'->>'nome'
        );
      END IF;
    END IF;

    -- Busca o nome do cliente na proposal_parties como última tentativa
    IF v_client_name IS NULL OR v_client_name = '' OR v_client_name = 'Não informado' THEN
      SELECT name INTO v_client_name
      FROM public.proposal_parties
      WHERE proposal_link_id = v_link.id
        AND role IN ('primary_tenant', 'company', 'primary_tenant', 'company')
        AND name IS NOT NULL AND name <> '' AND name <> 'Não informado'
      ORDER BY CASE WHEN role IN ('primary_tenant', 'company') THEN 1 ELSE 2 END
      LIMIT 1;
    END IF;

    -- Verifica se já existe um card para este link
    SELECT id, title INTO v_card_id, v_existing_title
    FROM public.cards
    WHERE proposal_link_id = v_link.id
    LIMIT 1;

    -- Formata o NOVO título calculado
    v_title := CASE
      WHEN v_client_name IS NOT NULL AND v_client_name <> '' AND v_client_name <> 'Não informado' AND v_property_info IS NOT NULL AND v_property_info <> ''
        THEN v_client_name || ' — ' || v_property_info
      WHEN v_client_name IS NOT NULL AND v_client_name <> '' AND v_client_name <> 'Não informado'
        THEN v_client_name
      ELSE COALESCE(_payload->>'title', v_property_info, 'Nova Proposta')
    END;

    -- PROTEÇÃO: Nunca sobrescrever um título bom por um "Não informado" ou vazio
    IF v_existing_title IS NOT NULL 
       AND v_existing_title <> '' 
       AND v_existing_title NOT LIKE 'Não informado%'
       AND (v_title IS NULL OR v_title = '' OR v_title LIKE 'Não informado%') THEN
      v_title := v_existing_title;
    END IF;

    v_description    := _payload->>'description';

    IF v_docs_obs IS NOT NULL AND v_docs_obs <> '' THEN
       v_description := COALESCE(v_description || E'\n\n', '') || '**Observação sobre documentos:** ' || v_docs_obs;
    END IF;

    v_address        := COALESCE(_payload->>'address', v_link.address_summary);
    v_robust_code    := COALESCE(_payload->>'robust_code', v_link.codigo_robust::text);
    v_guarantee_type := _payload->>'guarantee_type';
    v_contract_type  := _payload->>'contract_type';
    v_proposal_resp  := COALESCE(_payload->>'proposal_responsible', v_link.broker_name);
    v_negotiation    := _payload->>'negotiation_details';

    -- Busca o board de locação
    SELECT id INTO v_locacao_board_id
    FROM public.boards
    WHERE name ILIKE '%Locação%'
    LIMIT 1;

    -- Busca as colunas do board
    IF v_locacao_board_id IS NOT NULL THEN
      -- Coluna de origem
      SELECT id INTO v_cadastro_col_id
      FROM public.columns
      WHERE board_id = v_locacao_board_id AND name ILIKE '%Cadastro iniciado%'
      LIMIT 1;

      -- Coluna de destino (Documentação enviada)
      SELECT id INTO v_docs_enviada_col_id
      FROM public.columns
      WHERE board_id = v_locacao_board_id AND name ILIKE '%Documentação enviada%'
      LIMIT 1;

      -- Fallback (Aguardando documentação) se a principal não existir
      IF v_docs_enviada_col_id IS NULL THEN
        SELECT id INTO v_fallback_col_id
        FROM public.columns
        WHERE board_id = v_locacao_board_id AND name ILIKE '%Aguardando documentação%'
        LIMIT 1;
        v_docs_enviada_col_id := v_fallback_col_id;
      END IF;
    END IF;

    IF v_card_id IS NOT NULL THEN
      -- Atualiza card existente
      UPDATE public.cards
      SET
        title = v_title,
        description = COALESCE(v_description, description),
        address = COALESCE(v_address, address),
        robust_code = COALESCE(v_robust_code, robust_code),
        building_name = COALESCE(v_building_name, building_name),
        guarantee_type = COALESCE(NULLIF(v_guarantee_type, '')::public.guarantee_type, guarantee_type),
        contract_type = COALESCE(NULLIF(v_contract_type, '')::public.contract_type, contract_type),
        proposal_responsible = COALESCE(v_proposal_resp, proposal_responsible),
        negotiation_details = COALESCE(v_negotiation, negotiation_details),
        proposal_submitted_at = now()
      WHERE id = v_card_id;

      -- Se estiver na coluna inicial ou em qualquer coluna que não seja a de destino, move para "Documentação enviada"
      -- (Mas só move se estiver vindo de colunas iniciais ou se for uma atualização de documentos)
      IF v_docs_enviada_col_id IS NOT NULL AND v_cadastro_col_id IS NOT NULL THEN
        UPDATE public.cards
        SET
          column_id = v_docs_enviada_col_id,
          column_entered_at = now()
        WHERE id = v_card_id AND (column_id = v_cadastro_col_id OR column_id IS NULL);
      END IF;
    ELSE
      -- Cria novo card
      IF v_locacao_board_id IS NULL OR v_docs_enviada_col_id IS NULL THEN
        RAISE EXCEPTION 'Configuração do board de locação ou coluna de destino não encontrada';
      END IF;

      SELECT COALESCE(MAX(position), -1) + 1 INTO v_next_position
      FROM public.cards
      WHERE column_id = v_docs_enviada_col_id AND is_archived = false;

      INSERT INTO public.cards (
        title, description, board_id, column_id, position,
        address, robust_code, building_name, guarantee_type,
        contract_type, proposal_responsible, negotiation_details,
        proposal_link_id, proposal_submitted_at, column_entered_at
      )
      VALUES (
        v_title, v_description, v_locacao_board_id, v_docs_enviada_col_id, v_next_position,
        v_address, v_robust_code, v_building_name, 
        NULLIF(v_guarantee_type, '')::public.guarantee_type,
        NULLIF(v_contract_type, '')::public.contract_type, 
        v_proposal_resp, v_negotiation,
        v_link.id, now(), now()
      )
      RETURNING id INTO v_card_id;

      v_card_was_created := true;
    END IF;

    -- Lógica de Correção
    v_correction_request_id := NULLIF(_payload->>'correction_request_id', '')::uuid;
    
    -- Se não vier no payload, tenta a última pending
    IF v_correction_request_id IS NULL THEN
      SELECT id INTO v_correction_request_id
      FROM public.proposal_correction_requests
      WHERE proposal_link_id = v_link.id AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_correction_request_id IS NOT NULL THEN
      UPDATE public.proposal_correction_requests
      SET 
        status = 'responded',
        responded_at = COALESCE(responded_at, now())
      WHERE id = v_correction_request_id 
        AND proposal_link_id = v_link.id
        AND status = 'pending'
      RETURNING message, requested_sections INTO v_correction_message, v_correction_sections;

      IF FOUND THEN
        v_correction_responded := true;
        
        -- Verifica se são apenas documentos
        SELECT COALESCE(bool_and(
          CASE 
            WHEN jsonb_typeof(s) = 'string' THEN s = 'documentos'
            WHEN jsonb_typeof(s) = 'object' THEN s->>'step' = 'documents'
            ELSE false
          END
        ), false) INTO v_correction_only_docs
        FROM jsonb_array_elements(v_correction_sections) AS s;

        INSERT INTO public.card_activity_logs (
          card_id, event_type, title, description, metadata
        )
        VALUES (
          v_card_id,
          'proposal_correction_responded',
          CASE WHEN v_correction_only_docs THEN '📎 Complementação de documentos recebida' ELSE '✅ Cliente respondeu à solicitação de correção' END,
          'Resposta à solicitação: ' || COALESCE(v_correction_message, ''),
          jsonb_build_object(
            'kind', 'correction_responded',
            'only_documents', v_correction_only_docs,
            'correction_request_id', v_correction_request_id
          )
        );
      END IF;
    END IF;

    -- Atualiza status do link
    UPDATE public.proposal_links
    SET status = 'submitted'
    WHERE id = v_link.id;

    -- Registra log de envio padrão, evitando duplicidade para o mesmo link se já existir um log recente
    SELECT EXISTS (
      SELECT 1 FROM public.card_activity_logs 
      WHERE card_id = v_card_id 
        AND event_type = 'proposal_submitted' 
        AND (metadata->>'link_id')::uuid = v_link.id
        AND created_at > now() - interval '1 hour'
    ) INTO v_activity_exists;

    IF NOT v_activity_exists THEN
      INSERT INTO public.card_activity_logs (
        card_id, event_type, title, description, metadata
      )
      VALUES (
        v_card_id,
        'proposal_submitted',
        'Proposta enviada pelo cliente',
        'O cliente finalizou o preenchimento da proposta pública.',
        jsonb_build_object(
          'link_id', v_link.id,
          'client_name', v_client_name,
          'was_created', v_card_was_created
        )
      );
    END IF;

    -- Aplica checklists da etapa se a função existir
    BEGIN
      PERFORM public.apply_active_checklist_templates(v_card_id);
    EXCEPTION WHEN OTHERS THEN
      -- Se a função não existir ou falhar, ignora silenciosamente para não quebrar o fluxo principal
      NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'card_id', v_card_id,
      'was_created', v_card_was_created,
      'correction_request_id', v_correction_request_id,
      'correction_marked_responded', v_correction_responded
    );
  END;
$function$;

-- GRANT explicit permission for anonymous users to call the RPC (if not already granted)
GRANT EXECUTE ON FUNCTION public.finalize_public_proposal(uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.finalize_public_proposal(uuid, jsonb) TO authenticated;

-- Reparo de dados: mover cards presos
DO $$
DECLARE
  v_locacao_board_id uuid;
  v_cadastro_col_id uuid;
  v_docs_enviada_col_id uuid;
BEGIN
  -- Busca o board de locação
  SELECT id INTO v_locacao_board_id FROM public.boards WHERE name ILIKE '%Locação%' LIMIT 1;
  
  IF v_locacao_board_id IS NOT NULL THEN
    SELECT id INTO v_cadastro_col_id FROM public.columns WHERE board_id = v_locacao_board_id AND name ILIKE '%Cadastro iniciado%' LIMIT 1;
    SELECT id INTO v_docs_enviada_col_id FROM public.columns WHERE board_id = v_locacao_board_id AND name ILIKE '%Documentação enviada%' LIMIT 1;
    
    IF v_cadastro_col_id IS NOT NULL AND v_docs_enviada_col_id IS NOT NULL THEN
      -- Move cards que já enviaram proposta mas estão na coluna errada
      UPDATE public.cards
      SET column_id = v_docs_enviada_col_id, column_entered_at = now()
      WHERE column_id = v_cadastro_col_id 
        AND proposal_submitted_at IS NOT NULL
        AND board_id = v_locacao_board_id;
    END IF;
  END IF;
END $$;

-- Reparo de dados: sincronizar status de correções atendidas
UPDATE public.proposal_correction_requests pcr
SET status = 'responded', responded_at = COALESCE(responded_at, now())
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.proposal_documents pd 
    WHERE pd.correction_request_id = pcr.id
  );
