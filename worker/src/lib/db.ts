import type { Env } from '../types';

export interface EventRow {
  ts: number;
  event_type: string;
  visitor_id: string | null;
  session_id: string | null;
  path: string | null;
  section: string | null;
  label: string | null;
  referrer: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  channel: string | null;
  audience: string | null;
  city: string | null;
  region: string | null;
}

export function insertStmt(env: Env, e: EventRow): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO events (ts, event_type, visitor_id, session_id, path, section, label, referrer, country, device, browser, os, channel, audience, city, region)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    e.ts,
    e.event_type,
    e.visitor_id,
    e.session_id,
    e.path,
    e.section,
    e.label,
    e.referrer,
    e.country,
    e.device,
    e.browser,
    e.os,
    e.channel,
    e.audience,
    e.city,
    e.region,
  );
}

export interface LeadRow {
  ts: number;
  name: string | null;
  email: string | null;
  message: string | null;
  channel: string | null;
  audience: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  user_agent: string | null;
  emailed: number;
}

export function leadStmt(env: Env, l: LeadRow): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO leads (ts, name, email, message, channel, audience, country, city, region, device, browser, os, user_agent, emailed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    l.ts,
    l.name,
    l.email,
    l.message,
    l.channel,
    l.audience,
    l.country,
    l.city,
    l.region,
    l.device,
    l.browser,
    l.os,
    l.user_agent,
    l.emailed,
  );
}
