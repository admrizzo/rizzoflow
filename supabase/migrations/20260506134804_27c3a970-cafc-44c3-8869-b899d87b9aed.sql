-- Ensure REPLICA IDENTITY is set to FULL for the attachments table to get complete old/new records in realtime
ALTER TABLE public.chat_message_attachments REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_message_attachments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Handle case where it might be added concurrently
END $$;