CREATE OR REPLACE FUNCTION public.clear_public_proposal_parties(
  _public_token uuid,
  _proposal_link_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id uuid;
  v_deleted integer;
BEGIN
  IF _public_token IS NULL OR _proposal_link_id IS NULL THEN
    RAISE EXCEPTION 'public_token e proposal_link_id são obrigatórios';
  END IF;

  -- Valida que o token pertence ao proposal_link informado
  SELECT id INTO v_link_id
  FROM public.proposal_links
  WHERE id = _proposal_link_id
    AND public_token = _public_token
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido para esta proposta';
  END IF;

  -- Apaga apenas envolvidos desta proposta
  WITH d AS (
    DELETE FROM public.proposal_parties
    WHERE proposal_link_id = v_link_id
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM d;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'proposal_link_id', v_link_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_public_proposal_parties(uuid, uuid) TO anon, authenticated;