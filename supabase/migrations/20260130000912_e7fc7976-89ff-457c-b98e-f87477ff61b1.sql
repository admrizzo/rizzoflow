-- Drop the old constraint and create a new one with all party types
ALTER TABLE public.card_parties 
DROP CONSTRAINT card_parties_party_type_check;

ALTER TABLE public.card_parties 
ADD CONSTRAINT card_parties_party_type_check 
CHECK (party_type = ANY (ARRAY[
  'vendedor'::text, 
  'comprador'::text, 
  'procurador'::text, 
  'vendedor_anterior'::text,
  'locatario'::text,
  'locador'::text,
  'fiador'::text,
  'proprietario'::text
]));