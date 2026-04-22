-- Add deadline edit tracking fields to cards table
ALTER TABLE public.cards
ADD COLUMN deadline_edited_at timestamp with time zone,
ADD COLUMN deadline_edited_by uuid;