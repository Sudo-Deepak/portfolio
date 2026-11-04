import type { Env } from '../types';

export interface EventRow {
  ts: number;
  event_type: string;
  visitor_id: string | null;
  path: string | null;
  section: string | null;
  referrer: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
}

export function insertStmt(env: Env, e: EventRow): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO events (ts, event_type, visitor_id, path, section, referrer, country, device, browser, os)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    e.ts,
    e.event_type,
    e.visitor_id,
    e.path,
    e.section,
    e.referrer,
    e.country,
    e.device,
    e.browser,
    e.os,
  );
}
