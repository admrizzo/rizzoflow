-- Create app_settings table for global app configuration
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  force_refresh_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO public.app_settings (id) VALUES ('main');

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read app settings
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Only admins can update app settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;