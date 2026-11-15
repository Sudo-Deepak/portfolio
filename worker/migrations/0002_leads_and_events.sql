-- 0002: contact leads + richer events.
-- Adds the `leads` table (durable record of every contact-form submission) and two
-- new columns to `events` (session_id for session/bounce/duration analytics, label
-- for custom cta_click / scroll_depth events). Apply to the live DB with:
--   wrangler d1 execute portfolio_analytics --remote --file migrations/0002_leads_and_events.sql
-- Existing rows get NULL for the new columns, which the stats queries handle.

ALTER TABLE events ADD COLUMN session_id TEXT;
ALTER TABLE events ADD COLUMN label TEXT;
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         INTEGER NOT NULL,
  name       TEXT,
  email      TEXT,
  message    TEXT,
  channel    TEXT,
  audience   TEXT,
  country    TEXT,
  city       TEXT,
  region     TEXT,
  device     TEXT,
  browser    TEXT,
  os         TEXT,
  user_agent TEXT,
  emailed    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_leads_ts ON leads(ts);
