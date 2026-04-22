-- Add owner-only visibility config to board_config
ALTER TABLE public.board_config 
ADD COLUMN IF NOT EXISTS owner_only_visibility boolean DEFAULT false;

-- Add comment explaining the feature
COMMENT ON COLUMN public.board_config.owner_only_visibility IS 'When true, users can only see cards they created (except admins who see all)';

-- Create function to check if a user can view a card based on board settings
CREATE OR REPLACE FUNCTION public.can_view_card(_user_id uuid, _card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cards c
    LEFT JOIN public.board_config bc ON bc.board_id = c.board_id
    WHERE c.id = _card_id
      AND (
        -- Admins can always see all cards
        has_role(_user_id, 'admin'::app_role)
        -- User has board access AND (visibility is not restricted OR user is the creator)
        OR (
          has_board_access(_user_id, c.board_id)
          AND (
            COALESCE(bc.owner_only_visibility, false) = false
            OR c.created_by = _user_id
          )
        )
      )
  )
$$;

-- Create function to check if user can manage (update/transfer) a card
CREATE OR REPLACE FUNCTION public.can_manage_card(_user_id uuid, _card_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cards c
    LEFT JOIN public.board_config bc ON bc.board_id = c.board_id
    WHERE c.id = _card_id
      AND (
        -- Admins can manage all cards
        has_role(_user_id, 'admin'::app_role)
        -- Editors can manage cards in non-restricted boards
        OR (
          has_role(_user_id, 'editor'::app_role)
          AND has_board_access(_user_id, c.board_id)
          AND (
            COALESCE(bc.owner_only_visibility, false) = false
            OR c.created_by = _user_id
          )
        )
      )
  )
$$;

-- Enable owner_only_visibility for Fluxo Administrativo
UPDATE public.board_config 
SET owner_only_visibility = true 
WHERE board_id = 'e9a38d52-7403-4aec-87af-c886774af748';

-- If no config exists for Fluxo Administrativo, create one
INSERT INTO public.board_config (board_id, owner_only_visibility)
VALUES ('e9a38d52-7403-4aec-87af-c886774af748', true)
ON CONFLICT (board_id) DO UPDATE SET owner_only_visibility = true;