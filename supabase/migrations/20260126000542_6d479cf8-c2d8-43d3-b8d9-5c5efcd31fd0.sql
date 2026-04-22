-- Add length constraints for input validation
-- Cards table
ALTER TABLE public.cards ADD CONSTRAINT card_title_length 
  CHECK (length(title) <= 200 AND length(title) > 0);
ALTER TABLE public.cards ADD CONSTRAINT card_description_length 
  CHECK (description IS NULL OR length(description) <= 5000);
ALTER TABLE public.cards ADD CONSTRAINT card_address_length 
  CHECK (address IS NULL OR length(address) <= 500);

-- Comments table
ALTER TABLE public.comments ADD CONSTRAINT comment_content_length 
  CHECK (length(content) <= 2000 AND length(content) > 0);

-- Checklists table
ALTER TABLE public.checklists ADD CONSTRAINT checklist_name_length 
  CHECK (length(name) <= 200 AND length(name) > 0);

-- Checklist items table
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_item_content_length 
  CHECK (length(content) <= 500 AND length(content) > 0);
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_item_dismissed_reason_length 
  CHECK (dismissed_reason IS NULL OR length(dismissed_reason) <= 500);

-- Columns table
ALTER TABLE public.columns ADD CONSTRAINT column_name_length 
  CHECK (length(name) <= 100 AND length(name) > 0);

-- Boards table
ALTER TABLE public.boards ADD CONSTRAINT board_name_length 
  CHECK (length(name) <= 100 AND length(name) > 0);
ALTER TABLE public.boards ADD CONSTRAINT board_description_length 
  CHECK (description IS NULL OR length(description) <= 1000);

-- Labels table
ALTER TABLE public.labels ADD CONSTRAINT label_name_length 
  CHECK (length(name) <= 50 AND length(name) > 0);

-- Profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profile_full_name_length 
  CHECK (length(full_name) <= 200 AND length(full_name) > 0);

-- Notifications table
ALTER TABLE public.notifications ADD CONSTRAINT notification_title_length 
  CHECK (length(title) <= 200 AND length(title) > 0);
ALTER TABLE public.notifications ADD CONSTRAINT notification_message_length 
  CHECK (length(message) <= 1000 AND length(message) > 0);