-- Analytics event log. One row per discrete event; `event_type` discriminates
-- pageview / section_view / resume_download. All aggregation is done with GROUP BY.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,            -- epoch milliseconds (server-set)
  event_type  TEXT NOT NULL,               -- 'pageview' | 'section_view' | 'resume_download'
  visitor_id  TEXT,                         -- anonymous client UUID (unique-visitor counts)
  path        TEXT,                         -- e.g. '/portfolio/'
  section     TEXT,                         -- section id for 'section_view'
  referrer    TEXT,                         -- referrer host (normalized), null = direct
  country     TEXT,                         -- request.cf.country
  device      TEXT,                         -- 'mobile' | 'tablet' | 'desktop'
  browser     TEXT,                         -- 'Chrome' | 'Safari' | ...
  os          TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type_ts  ON events(event_type, ts);
CREATE INDEX IF NOT EXISTS idx_events_visitor  ON events(visitor_id);

-- Reserved for future daily rollups / pruning (kept so reset can clear it safely).
CREATE TABLE IF NOT EXISTS daily_rollup (
  day        TEXT PRIMARY KEY,             -- 'YYYY-MM-DD'
  pageviews  INTEGER DEFAULT 0,
  uniques    INTEGER DEFAULT 0,
  downloads  INTEGER DEFAULT 0
);

-- Binary assets (the resume PDF) stored directly in D1 so no R2 bucket is needed.
-- Keyed by RESUME_OBJECT_KEY. Not touched by the analytics reset.
CREATE TABLE IF NOT EXISTS assets (
  key        TEXT PRIMARY KEY,
  data       BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
