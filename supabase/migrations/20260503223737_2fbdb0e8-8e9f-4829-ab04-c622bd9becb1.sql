CREATE OR REPLACE FUNCTION public.create_group_conversation(_name text, _participant_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_conv_id uuid;
  v_pid uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  IF NOT public.is_team_member(v_me) THEN
    RAISE EXCEPTION 'Apenas membros da equipe podem criar grupos';
  END IF;

  IF _name IS NULL OR trim(_name) = '' THEN
    RAISE EXCEPTION 'Nome do grupo é obrigatório';
  END IF;

  -- Create conversation
  INSERT INTO public.chat_conversations (type, name, created_by)
  VALUES ('group', _name, v_me)
  RETURNING id INTO v_conv_id;

  -- Add creator as participant
  INSERT INTO public.chat_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_me);

  -- Add other participants
  FOREACH v_pid IN ARRAY _participant_ids
  LOOP
    IF v_pid <> v_me AND public.is_team_member(v_pid) THEN
      INSERT INTO public.chat_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_pid)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$function$;