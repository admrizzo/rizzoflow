
-- Remove old constraint and add new one with multi_checkbox support
ALTER TABLE board_fields DROP CONSTRAINT IF EXISTS board_fields_field_type_check;
ALTER TABLE board_fields ADD CONSTRAINT board_fields_field_type_check 
  CHECK (field_type = ANY (ARRAY['text'::text, 'textarea'::text, 'select'::text, 'date'::text, 'checkbox'::text, 'number'::text, 'multi_checkbox'::text]));
