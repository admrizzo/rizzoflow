
DROP POLICY "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Team members can read app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (is_team_member(auth.uid()));
