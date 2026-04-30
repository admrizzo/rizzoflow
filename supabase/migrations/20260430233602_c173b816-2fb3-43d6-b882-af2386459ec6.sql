
-- Mesclar usuário duplicado guilherme.larcerda (typo, antigo) -> guilherme.lacerda (correto, novo)
DO $$
DECLARE
  v_old uuid := 'a23664a2-942b-4220-91d6-be3dfdb39ba3';
  v_new uuid := 'c8395f0f-785b-429e-a2c4-ca1256af5cdc';
BEGIN
  -- Reaponta menções recebidas
  UPDATE public.comment_mentions SET mentioned_user_id = v_new WHERE mentioned_user_id = v_old;
  -- Reaponta notificações
  UPDATE public.notifications SET user_id = v_new WHERE user_id = v_old;

  -- user_boards: já existe no novo com mesmo board → só remove o antigo
  DELETE FROM public.user_boards WHERE user_id = v_old;
  -- user_roles do antigo (novo já tem corretor)
  DELETE FROM public.user_roles WHERE user_id = v_old;
  -- profile do antigo
  DELETE FROM public.profiles WHERE user_id = v_old;
  -- auth user antigo
  DELETE FROM auth.users WHERE id = v_old;
END $$;
