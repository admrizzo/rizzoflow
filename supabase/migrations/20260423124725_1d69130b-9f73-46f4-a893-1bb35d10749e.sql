-- Create the Central de Propostas board
INSERT INTO public.boards (id, name, description, icon, color, position, is_active)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Central de Propostas',
  'Pipeline de propostas de locação',
  'file-text',
  '#8b5cf6',
  10,
  true
);

-- Create columns for the board
INSERT INTO public.columns (board_id, name, position, color) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nova proposta', 0, '#3b82f6'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Em preenchimento', 1, '#f59e0b'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aguardando documentos', 2, '#ef4444'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Em análise', 3, '#8b5cf6'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aguardando proprietário', 4, '#f97316'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Aprovada', 5, '#22c55e'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Reprovada', 6, '#dc2626'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Convertida em contrato', 7, '#10b981');
