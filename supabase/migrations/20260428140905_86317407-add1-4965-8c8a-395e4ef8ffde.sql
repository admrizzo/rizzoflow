
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'cards','columns','boards','proposal_links','proposal_documents',
    'card_activity_logs','checklists','checklist_items',
    'card_members','card_labels','comments','comment_mentions','notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
             WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
