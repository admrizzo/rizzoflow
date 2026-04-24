
-- Atualiza retroativamente os cards cujo building_name foi preenchido com texto
-- comercial de anúncio. Usa a propriedade vinculada via robust_code para
-- recompor a identificação operacional (complemento + bairro, ou endereço,
-- ou tipo + bairro).
WITH candidates AS (
  SELECT
    c.id AS card_id,
    c.title AS old_title,
    c.building_name AS old_building,
    p.codigo_robust,
    p.complemento,
    p.bairro,
    p.tipo_imovel,
    p.logradouro,
    p.numero,
    CASE
      WHEN COALESCE(p.complemento, '') <> ''
        THEN CASE WHEN COALESCE(p.bairro, '') <> ''
                  THEN p.complemento || ' - ' || p.bairro
                  ELSE p.complemento END
      WHEN COALESCE(p.logradouro, '') <> '' AND COALESCE(p.numero, '') <> ''
        THEN CASE WHEN COALESCE(p.bairro, '') <> ''
                  THEN p.logradouro || ', ' || p.numero || ' - ' || p.bairro
                  ELSE p.logradouro || ', ' || p.numero END
      WHEN COALESCE(p.tipo_imovel, '') <> '' AND COALESCE(p.bairro, '') <> ''
        THEN p.tipo_imovel || ' - ' || p.bairro
      WHEN COALESCE(p.bairro, '') <> '' THEN p.bairro
      WHEN COALESCE(p.tipo_imovel, '') <> '' THEN p.tipo_imovel
      ELSE 'Imóvel ' || p.codigo_robust::text
    END AS new_identification
  FROM public.cards c
  JOIN public.properties p ON p.codigo_robust::text = c.robust_code
  WHERE c.is_archived = false
    AND c.building_name IS NOT NULL
    AND (
      c.building_name ILIKE 'viva %'
      OR c.building_name ILIKE 'aproveite %'
      OR c.building_name ILIKE 'conheça %'
      OR c.building_name ILIKE 'conheca %'
      OR c.building_name ILIKE 'descubra %'
      OR c.building_name ILIKE 'lindo %'
      OR c.building_name ILIKE 'linda %'
      OR c.building_name ILIKE 'amplo %'
      OR c.building_name ILIKE 'ampla %'
      OR c.building_name ILIKE 'maravilhos%'
      OR c.building_name ILIKE 'oportunidade%'
      OR c.building_name ILIKE 'apartamento %'
      OR c.building_name ILIKE 'casa %'
      OR c.building_name ILIKE 'sobrado %'
      OR c.building_name ILIKE 'kitnet %'
      OR c.building_name ILIKE 'studio %'
      OR c.building_name ILIKE 'flat %'
      OR c.building_name ILIKE 'cobertura %'
      OR c.building_name ILIKE 'loja %'
      OR c.building_name ILIKE 'sala %'
      OR c.building_name ILIKE 'galpão %'
      OR c.building_name ILIKE 'galpao %'
      OR c.building_name ILIKE '%praticidade%'
      OR c.building_name ILIKE '%conforto%'
      OR c.building_name ILIKE '%localiza%privilegiada%'
      OR (length(c.building_name) > 35 AND array_length(string_to_array(c.building_name, ' '), 1) >= 5)
    )
)
UPDATE public.cards c
SET
  building_name = cand.new_identification,
  title = CASE
    WHEN c.title = cand.old_building THEN cand.new_identification
    WHEN c.title ILIKE '%' || cand.old_building || '%'
      THEN replace(c.title, cand.old_building, cand.new_identification)
    ELSE c.title
  END,
  updated_at = now()
FROM candidates cand
WHERE c.id = cand.card_id;
