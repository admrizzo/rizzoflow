DROP POLICY IF EXISTS "Public can update cards from their proposal link" ON public.cards;

CREATE POLICY "Public can submit proposal once per linked card"
ON public.cards
FOR UPDATE
TO anon
USING (proposal_link_id IS NOT NULL AND proposal_submitted_at IS NULL)
WITH CHECK (proposal_link_id IS NOT NULL);