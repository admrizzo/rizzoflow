-- ============================================================
-- CHAT INTERNO GLOBAL
-- ============================================================

-- 1) Tabelas
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dm','group')),
  name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_participants (
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conv_created ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);

-- 2) Função SECURITY DEFINER (evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

-- 3) RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;

-- chat_conversations
CREATE POLICY "Participantes veem suas conversas"
ON public.chat_conversations FOR SELECT TO authenticated
USING (public.is_chat_participant(auth.uid(), id));

CREATE POLICY "Membros da equipe podem criar conversas"
ON public.chat_conversations FOR INSERT TO authenticated
WITH CHECK (public.is_team_member(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Admins gerenciam conversas"
ON public.chat_conversations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- chat_participants
CREATE POLICY "Participantes veem participantes da mesma conversa"
ON public.chat_participants FOR SELECT TO authenticated
USING (public.is_chat_participant(auth.uid(), conversation_id));

CREATE POLICY "Membros podem inserir participantes em conversas que participam ou criando nova"
ON public.chat_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_team_member(auth.uid())
  AND (
    public.is_chat_participant(auth.uid(), conversation_id)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Usuário atualiza próprio registro de leitura"
ON public.chat_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário sai de própria conversa"
ON public.chat_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- chat_messages
CREATE POLICY "Participantes veem mensagens da conversa"
ON public.chat_messages FOR SELECT TO authenticated
USING (public.is_chat_participant(auth.uid(), conversation_id));

CREATE POLICY "Participantes enviam mensagens como si mesmos"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_chat_participant(auth.uid(), conversation_id)
);

CREATE POLICY "Admins gerenciam mensagens"
ON public.chat_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) RPC: get_or_create_dm
CREATE OR REPLACE FUNCTION public.get_or_create_dm(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_conv_id uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT public.is_team_member(v_me) THEN
    RAISE EXCEPTION 'Apenas membros da equipe podem usar o chat';
  END IF;
  IF _other_user_id IS NULL OR _other_user_id = v_me THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;
  IF NOT public.is_team_member(_other_user_id) THEN
    RAISE EXCEPTION 'Destinatário não é membro da equipe';
  END IF;

  -- Procura DM existente
  SELECT c.id INTO v_conv_id
  FROM public.chat_conversations c
  WHERE c.type = 'dm'
    AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = c.id AND p.user_id = v_me)
    AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.conversation_id = c.id AND p.user_id = _other_user_id)
    AND (SELECT count(*) FROM public.chat_participants p WHERE p.conversation_id = c.id) = 2
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO public.chat_conversations (type, created_by)
  VALUES ('dm', v_me)
  RETURNING id INTO v_conv_id;

  INSERT INTO public.chat_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_me), (v_conv_id, _other_user_id);

  RETURN v_conv_id;
END;
$$;

-- 5) Trigger updated_at em conversations quando vier mensagem nova
CREATE OR REPLACE FUNCTION public.touch_chat_conversation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_chat_conversation
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_conversation();

-- 6) Realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;