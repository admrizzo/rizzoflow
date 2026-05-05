-- 1. Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create table for chat message attachments
CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    attachment_type TEXT NOT NULL CHECK (attachment_type IN ('image', 'file', 'audio')),
    duration_seconds NUMERIC NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message_id ON public.chat_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_conversation_id ON public.chat_message_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_uploaded_by ON public.chat_message_attachments(uploaded_by);

-- 4. Enable RLS on the metadata table
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

-- 5. Policies for chat_message_attachments
-- SELECT: Participants of the conversation or admins
CREATE POLICY "Participants can view message attachments"
ON public.chat_message_attachments
FOR SELECT
USING (
    is_chat_participant(auth.uid(), conversation_id)
    OR has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: Participants can upload to their conversations
CREATE POLICY "Participants can insert message attachments"
ON public.chat_message_attachments
FOR INSERT
WITH CHECK (
    is_chat_participant(auth.uid(), conversation_id)
    AND auth.uid() = uploaded_by
);

-- DELETE: Owner or Admin
CREATE POLICY "Owner or admin can delete attachments"
ON public.chat_message_attachments
FOR DELETE
USING (
    auth.uid() = uploaded_by
    OR has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Storage Policies for 'chat-attachments' bucket
-- SELECT: Access based on metadata table visibility
CREATE POLICY "Authenticated users can select chat attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND (
        EXISTS (
            SELECT 1 FROM public.chat_message_attachments cma
            WHERE cma.storage_path = name
            AND (
                is_chat_participant(auth.uid(), cma.conversation_id)
                OR has_role(auth.uid(), 'admin'::app_role)
            )
        )
    )
);

-- INSERT: Authenticated users can upload
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-attachments'
);

-- DELETE: Owner or Admin
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND (
        owner = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
    )
);