import type { Env } from '../types';
import { corsHeaders } from '../lib/cors';
import { isBot, parseDevice, parseBrowser, parseOS } from '../lib/ua';
import { insertStmt, type EventRow } from '../lib/db';

const ALLOWED_TYPES = new Set(['pageview', 'section_view', 'resume_download']);
const MAX_BODY = 4096;

function normalizeReferrer(ref: unknown): string | null {
  if (typeof ref !== 'string' || !ref) return null;
  try {
    return new URL(ref).hostname || null;
  } catch {
    return null;
  }
}

export async function handleCollect(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const headers = corsHeaders(env, request);
  const drop = () => new Response(null, { status: 204, headers });

  // Only accept beacons that originate from the portfolio site.
  const origin = request.headers.get('Origin');
  if (origin && env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) return drop();

  const ua = request.headers.get('User-Agent') || '';
  if (isBot(ua)) return drop();

  let body: any;
  try {
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return drop();
    body = JSON.parse(text);
  } catch {
    return drop();
  }

  const type = body && typeof body.type === 'string' ? body.type : '';
  if (!ALLOWED_TYPES.has(type)) return drop();

  const ts = Date.now();
  const country = ((request.cf?.country as string) || 'XX').slice(0, 4);
  const device = parseDevice(ua);
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const vid = typeof body.vid === 'string' ? body.vid.slice(0, 64) : null;
  const path = typeof body.path === 'string' ? body.path.slice(0, 256) : null;

  const mk = (event_type: string, section: string | null, referrer: string | null): EventRow => ({
    ts,
    event_type,
    visitor_id: vid,
    path,
    section,
    referrer,
    country,
    device,
    browser,
    os,
  });

  const stmts: D1PreparedStatement[] = [];

  if (type === 'section_view') {
    const list: unknown[] = Array.isArray(body.sections)
      ? body.sections
      : typeof body.section === 'string'
        ? [body.section]
        : [];
    for (const s of list.slice(0, 20)) {
      if (typeof s === 'string' && s) stmts.push(insertStmt(env, mk('section_view', s.slice(0, 64), null)));
    }
  } else {
    const referrer = type === 'pageview' ? normalizeReferrer(body.ref) : null;
    stmts.push(insertStmt(env, mk(type, null, referrer)));
  }

  if (stmts.length) {
    // Await the (tiny) write so the event is durably stored before we respond.
    // The client uses sendBeacon and never waits for this response anyway.
    try {
      if (stmts.length === 1) await stmts[0].run();
      else await env.DB.batch(stmts);
    } catch {
      // Analytics is best-effort — never surface a failure to the beacon.
    }
  }

  return drop();
}
