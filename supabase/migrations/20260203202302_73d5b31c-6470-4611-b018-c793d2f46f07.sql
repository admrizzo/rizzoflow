-- Create table to track when users last viewed each card
CREATE TABLE public.card_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- Enable RLS
ALTER TABLE public.card_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own card views
CREATE POLICY "Users can view their own card views"
ON public.card_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own card views
CREATE POLICY "Users can insert their own card views"
ON public.card_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own card views
CREATE POLICY "Users can update their own card views"
ON public.card_views
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_card_views_user_card ON public.card_views(user_id, card_id);
CREATE INDEX idx_card_views_card ON public.card_views(card_id);

-- Enable realtime for card_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_views;