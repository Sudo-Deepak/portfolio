-- Adds traffic-source + finer geo columns to the existing events table.
-- Run ONCE against each database (local and remote). SQLite ALTER TABLE ADD
-- COLUMN is non-destructive: existing rows get NULL for the new columns.
--   npm run db:migrate:local
--   npm run db:migrate:remote
ALTER TABLE events ADD COLUMN channel TEXT;
ALTER TABLE events ADD COLUMN audience TEXT;
ALTER TABLE events ADD COLUMN city TEXT;
ALTER TABLE events ADD COLUMN region TEXT;
