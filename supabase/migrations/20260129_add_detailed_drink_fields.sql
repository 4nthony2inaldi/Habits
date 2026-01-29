-- Migration: Add detailed drink breakdown and meal location fields
-- Run this migration to add new detailed tracking fields to an existing database

-- Detailed wine breakdown (rolls up to 'wine')
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS wine_red SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS wine_white SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS wine_sparkling SMALLINT DEFAULT 0;

-- Detailed cocktail/liquor breakdown (rolls up to 'liquor')
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_vodka SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_gin SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_tequila SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_whiskey SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_rum SMALLINT DEFAULT 0;
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS liquor_other SMALLINT DEFAULT 0;

-- Meal tracking
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS lunch_location TEXT CHECK (lunch_location IN ('home', 'out'));
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS dinner_location TEXT CHECK (dinner_location IN ('home', 'out'));
