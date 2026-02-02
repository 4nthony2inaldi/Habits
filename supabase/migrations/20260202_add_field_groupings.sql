-- Add field_groupings column to profiles table for customizable form field organization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS field_groupings JSONB DEFAULT NULL;
