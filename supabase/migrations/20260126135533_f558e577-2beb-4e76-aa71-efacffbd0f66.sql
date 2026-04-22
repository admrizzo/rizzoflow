-- Add new standard fields for card identification
ALTER TABLE public.cards 
ADD COLUMN robust_code text,
ADD COLUMN building_name text;

-- Add check constraints for validation (max 100 chars for code, 200 for building name)
ALTER TABLE public.cards
ADD CONSTRAINT cards_robust_code_length CHECK (robust_code IS NULL OR char_length(robust_code) <= 100),
ADD CONSTRAINT cards_building_name_length CHECK (building_name IS NULL OR char_length(building_name) <= 200);