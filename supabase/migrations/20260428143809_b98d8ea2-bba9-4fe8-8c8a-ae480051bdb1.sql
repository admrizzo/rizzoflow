-- Backfill: criar registros em proposal_documents para arquivos no bucket
-- 'proposal-documents' cujos prefixos batem com proposal_links válidos e
-- ainda não foram registrados. Também vincula automaticamente ao card
-- existente do mesmo proposal_link_id.

INSERT INTO public.proposal_documents (
  card_id,
  proposal_link_id,
  category,
  category_label,
  owner_type,
  owner_label,
  file_name,
  file_size,
  mime_type,
  storage_path,
  uploaded_at
)
SELECT
  c.id AS card_id,
  pl.id AS proposal_link_id,
  COALESCE(split_part(o.name, '/', 3), 'outros') AS category,
  COALESCE(split_part(o.name, '/', 3), 'Outros') AS category_label,
  CASE
    WHEN split_part(o.name, '/', 2) LIKE 'fiador%' THEN 'fiador'
    WHEN split_part(o.name, '/', 2) = 'conjuge' THEN 'conjuge'
    WHEN split_part(o.name, '/', 2) = 'empresa' THEN 'empresa'
    WHEN split_part(o.name, '/', 2) = 'representante' THEN 'representante'
    WHEN split_part(o.name, '/', 2) = 'proponente' THEN 'proponente'
    ELSE 'outros'
  END AS owner_type,
  CASE
    WHEN split_part(o.name, '/', 2) LIKE 'fiador-%' THEN
      'Fiador ' || regexp_replace(split_part(o.name, '/', 2), '^fiador-', '')
    WHEN split_part(o.name, '/', 2) = 'conjuge' THEN 'Cônjuge'
    WHEN split_part(o.name, '/', 2) = 'empresa' THEN 'Empresa'
    WHEN split_part(o.name, '/', 2) = 'representante' THEN 'Representante Legal'
    WHEN split_part(o.name, '/', 2) = 'proponente' THEN 'Proponente'
    ELSE 'Outros'
  END AS owner_label,
  -- Remove timestamp prefixo "1234567890_"
  regexp_replace(split_part(o.name, '/', 4), '^[0-9]+_', '') AS file_name,
  COALESCE(NULLIF((o.metadata->>'size'),'')::bigint, 0) AS file_size,
  COALESCE(o.metadata->>'mimetype', 'application/octet-stream') AS mime_type,
  o.name AS storage_path,
  COALESCE(o.created_at, now()) AS uploaded_at
FROM storage.objects o
JOIN public.proposal_links pl ON pl.id::text = split_part(o.name, '/', 1)
LEFT JOIN public.cards c ON c.proposal_link_id = pl.id AND c.is_archived = false
WHERE o.bucket_id = 'proposal-documents'
  AND NOT EXISTS (
    SELECT 1 FROM public.proposal_documents pd
    WHERE pd.storage_path = o.name
  );

-- Garante card_id em registros existentes que tenham apenas proposal_link_id
UPDATE public.proposal_documents pd
SET card_id = c.id
FROM public.cards c
WHERE pd.card_id IS NULL
  AND pd.proposal_link_id IS NOT NULL
  AND c.proposal_link_id = pd.proposal_link_id
  AND c.is_archived = false;