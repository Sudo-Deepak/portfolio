import type { Env } from '../types';
import { corsHeaders } from '../lib/cors';
import { isBot, parseDevice, parseBrowser, parseOS } from '../lib/ua';
import { insertStmt, leadStmt, type EventRow, type LeadRow } from '../lib/db';
import { parseTags, classifyChannel } from '../lib/source';
import { sendLeadEmail } from '../lib/email';

const MAX_BODY = 8192;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lightweight per-IP rate limit (best-effort, via the SESSIONS KV): protects the
// Resend quota and D1 from a flood. KV isn't atomic, but this is a soft guard.
const RL_MAX = 5;
const RL_WINDOW = 600; // seconds

async function rateLimited(env: Env, ip: string): Promise<boolean> {
  if (!ip) return false;
  const key = `rl:contact:${ip}`;
  try {
    const n = Number((await env.SESSIONS.get(key)) || 0);
    if (n >= RL_MAX) return true;
    await env.SESSIONS.put(key, String(n + 1), { expirationTtl: RL_WINDOW });
  } catch {
    /* if KV is unavailable, don't block legitimate submissions */
  }
  return false;
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function handleContact(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const headers = { ...corsHeaders(env, request), 'Content-Type': 'application/json' };
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

  // Only accept submissions from the portfolio site.
  const origin = request.headers.get('Origin');
  if (origin && env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const ua = request.headers.get('User-Agent') || '';
  if (isBot(ua)) return json({ ok: true }); // silently accept-and-drop bots

  let body: any;
  try {
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return json({ ok: false, error: 'bad_request' }, 400);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot: real users never fill this hidden field. Accept-and-drop silently.
  if (str(body._honey, 1) || str(body.website, 1)) return json({ ok: true });

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const message = str(body.message, 5000);
  if (!name || !email || !message || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_fields' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await rateLimited(env, ip)) return json({ ok: false, error: 'rate_limited' }, 429);

  const ts = Date.now();
  const cf = request.cf || {};
  const country = ((cf.country as string) || 'XX').slice(0, 4);
  const city = ((cf.city as string) || '').slice(0, 80) || null;
  const region = ((cf.region as string) || '').slice(0, 80) || null;
  const device = parseDevice(ua);
  const browser = parseBrowser(ua);
  const os = parseOS(ua);
  const tags = parseTags(body.qs);
  const channel = classifyChannel(tags.source, null);

  // 1) Durable record first — the lead must survive even if email fails.
  const lead: LeadRow = {
    ts,
    name,
    email,
    message,
    channel,
    audience: tags.audience,
    country,
    city,
    region,
    device,
    browser,
    os,
    user_agent: ua.slice(0, 256) || null,
    emailed: 0,
  };

  // 2) Also log a contact_submit event for the analytics funnel.
  const event: EventRow = {
    ts,
    event_type: 'contact_submit',
    visitor_id: typeof body.vid === 'string' ? body.vid.slice(0, 64) : null,
    session_id: typeof body.sid === 'string' ? body.sid.slice(0, 64) : null,
    path: typeof body.path === 'string' ? body.path.slice(0, 256) : null,
    section: null,
    label: null,
    referrer: null,
    country,
    device,
    browser,
    os,
    channel,
    audience: tags.audience,
    city,
    region,
  };

  let leadId: number | null = null;
  try {
    const res = await leadStmt(env, lead).run();
    leadId = (res.meta?.last_row_id as number) ?? null;
    await insertStmt(env, event).run();
  } catch {
    // If we couldn't even store the lead, report failure so the client retries.
    return json({ ok: false, error: 'server_error' }, 500);
  }

  // 3) Best-effort email notification. Lead is already stored, so never fail here.
  const sent = await sendLeadEmail(env, { name, email, message, channel, country, city, region });
  if (sent && leadId != null) {
    try {
      await env.DB.prepare('UPDATE leads SET emailed = 1 WHERE id = ?').bind(leadId).run();
    } catch {
      /* non-critical */
    }
  }

  return json({ ok: true });
}
