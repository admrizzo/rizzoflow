-- Create table for custom field definitions per board
CREATE TABLE public.board_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'select', 'date', 'checkbox', 'number')),
  field_options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create table for storing custom field values per card
CREATE TABLE public.card_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES public.board_fields(id) ON DELETE CASCADE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(card_id, field_id)
);

-- Enable RLS
ALTER TABLE public.board_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_field_values ENABLE ROW LEVEL SECURITY;

-- RLS for board_fields - only admins can manage
CREATE POLICY "Admins podem gerenciar board_fields"
  ON public.board_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Membros da equipe podem ver board_fields"
  ON public.board_fields FOR SELECT
  USING (is_team_member(auth.uid()));

-- RLS for card_field_values
CREATE POLICY "Admins e editores podem gerenciar card_field_values"
  ON public.card_field_values FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Membros da equipe podem ver card_field_values"
  ON public.card_field_values FOR SELECT
  USING (is_team_member(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_board_fields_updated_at
  BEFORE UPDATE ON public.board_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_field_values_updated_at
  BEFORE UPDATE ON public.card_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();