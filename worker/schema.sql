-- Analytics event log. One row per discrete event; `event_type` discriminates
-- pageview / section_view / resume_download. All aggregation is done with GROUP BY.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,            -- epoch milliseconds (server-set)
  event_type  TEXT NOT NULL,               -- 'pageview' | 'section_view' | 'resume_download' | 'cta_click' | 'scroll_depth' | 'contact_submit'
  visitor_id  TEXT,                         -- anonymous client UUID (unique-visitor counts)
  session_id  TEXT,                         -- per-visit session id (sessionStorage, 30-min window)
  path        TEXT,                         -- e.g. '/portfolio/'
  section     TEXT,                         -- section id for 'section_view'
  label       TEXT,                         -- generic label: cta name / scroll depth bucket
  referrer    TEXT,                         -- referrer host (normalized), null = direct
  country     TEXT,                         -- request.cf.country
  device      TEXT,                         -- 'mobile' | 'tablet' | 'desktop'
  browser     TEXT,                         -- 'Chrome' | 'Safari' | ...
  os          TEXT,
  channel     TEXT,                         -- friendly traffic source: ?ref tag, else referrer bucket
  audience    TEXT,                         -- ?aud / utm_campaign tag (e.g. 'recruiter')
  city        TEXT,                         -- request.cf.city
  region      TEXT                          -- request.cf.region (state / province)
);

CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type_ts  ON events(event_type, ts);
CREATE INDEX IF NOT EXISTS idx_events_visitor  ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session  ON events(session_id);

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

-- Contact-form leads. Every submission is stored here (durable record) before the
-- best-effort email notification is sent, so no lead is ever lost. Precious data:
-- NOT touched by the analytics reset (treated like `assets`).
CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         INTEGER NOT NULL,            -- epoch milliseconds (server-set)
  name       TEXT,
  email      TEXT,
  message    TEXT,
  channel    TEXT,                         -- traffic source at submit time
  audience   TEXT,                         -- ?aud tag at submit time
  country    TEXT,
  city       TEXT,
  region     TEXT,
  device     TEXT,
  browser    TEXT,
  os         TEXT,
  user_agent TEXT,
  emailed    INTEGER NOT NULL DEFAULT 0    -- 1 once the Resend notification succeeds
);

CREATE INDEX IF NOT EXISTS idx_leads_ts ON leads(ts);
