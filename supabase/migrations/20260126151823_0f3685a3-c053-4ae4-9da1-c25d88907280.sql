-- Add deadline_dispensed fields to cards table
ALTER TABLE public.cards
ADD COLUMN deadline_dispensed boolean DEFAULT false,
ADD COLUMN deadline_dispensed_at timestamp with time zone,
ADD COLUMN deadline_dispensed_by uuid;