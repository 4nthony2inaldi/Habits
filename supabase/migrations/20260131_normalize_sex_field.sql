-- Normalize historical sex field values from 0-10 scale to binary 0/1
-- Any value > 0 becomes 1 (yes), 0 stays 0 (no)

UPDATE daily_entries
SET sex = 1
WHERE sex > 1;
