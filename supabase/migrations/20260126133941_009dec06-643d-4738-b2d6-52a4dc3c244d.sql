-- Add two new required fields to cards table
ALTER TABLE public.cards 
ADD COLUMN proposal_responsible text,
ADD COLUMN negotiation_details text;

-- Add check constraints for validation (max 500 chars)
ALTER TABLE public.cards
ADD CONSTRAINT cards_proposal_responsible_length CHECK (char_length(proposal_responsible) <= 500),
ADD CONSTRAINT cards_negotiation_details_length CHECK (char_length(negotiation_details) <= 500);