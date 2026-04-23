
-- Allow anonymous/public users to read properties
CREATE POLICY "Public can view properties"
ON public.properties FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read proposal_links (to get broker info)
CREATE POLICY "Public can view proposal_links"
ON public.proposal_links FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update proposal_links status
CREATE POLICY "Public can update proposal_links status"
ON public.proposal_links FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert cards (for proposal submission)
CREATE POLICY "Public can insert cards from proposals"
ON public.cards FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to read cards (for position calculation)
CREATE POLICY "Public can read cards for proposals"
ON public.cards FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read columns (for position lookup)
CREATE POLICY "Public can read columns"
ON public.columns FOR SELECT
TO anon
USING (true);
