import type { Env } from '../types';
import {
  verifyCredentials,
  createSession,
  getSession,
  destroySession,
  sessionCookie,
  clearSessionCookie,
} from '../lib/auth';
import { loginPage, dashboardPage } from '../ui/admin-ui';
import {
  getResumeFilename,
  setResumeFilename,
  getLeadsSeenTs,
  setLeadsSeenTs,
} from '../lib/settings';

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ Location: location });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function html(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const ALLOWED_RANGES = [7, 30, 90, 180];

function parseRange(request: Request): number {
  const raw = Number(new URL(request.url).searchParams.get('range'));
  return ALLOWED_RANGES.includes(raw) ? raw : 30;
}

// A compact { pageviews, uniques, downloads } window total used for the KPI deltas.
function windowTotals(row: Record<string, unknown> | undefined) {
  const r = row || {};
  return {
    pageviews: Number(r.pageviews || 0),
    uniques: Number(r.uniques || 0),
    downloads: Number(r.downloads || 0),
  };
}

async function getStats(env: Env, range: number) {
  const dayMs = 24 * 60 * 60 * 1000;
  const since = Date.now() - range * dayMs; // start of current window
  const prevSince = since - range * dayMs; // start of previous (comparison) window
  const seenTs = await getLeadsSeenTs(env);

  // Reusable window-total projection: current window vs the previous equal window.
  const WINDOW_TOTALS = `SELECT
       SUM(event_type='pageview')        AS pageviews,
       COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) AS uniques,
       SUM(event_type='resume_download') AS downloads
     FROM events`;

  const [totals, cur, prev, daily, topPages, channels, audiences, referrers, countries, cities, regions, devices, browsers, os, sections, heat, sessionAgg, newRet, interactions, scroll, leadsCount] =
    await env.DB.batch([
      // All-time headline totals.
      env.DB.prepare(WINDOW_TOTALS),
      // Current window (for KPI value + delta).
      env.DB.prepare(WINDOW_TOTALS + ' WHERE ts >= ?').bind(since),
      // Previous equal window (for KPI delta %).
      env.DB.prepare(WINDOW_TOTALS + ' WHERE ts >= ? AND ts < ?').bind(prevSince, since),
      // Daily series within window: pageviews, uniques and downloads per day.
      env.DB.prepare(
        `SELECT date(ts/1000,'unixepoch') AS day,
                SUM(event_type='pageview') AS views,
                COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) AS uniques,
                SUM(event_type='resume_download') AS downloads
         FROM events WHERE ts >= ?
         GROUP BY day ORDER BY day`,
      ).bind(since),
      // Top pages (uses the previously-unused `path`).
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(path,''),'(unknown)') AS path,
                COUNT(*) AS views,
                COUNT(DISTINCT visitor_id) AS uniques
         FROM events WHERE event_type='pageview' AND ts >= ?
         GROUP BY path ORDER BY views DESC LIMIT 10`,
      ).bind(since),
      // Traffic sources: friendly channel (explicit ?ref tag, else referrer bucket).
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(channel,''),'Direct') AS channel, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ?
         GROUP BY channel ORDER BY n DESC LIMIT 12`,
      ).bind(since),
      // Audience tags (?aud / utm_campaign), only where you tagged the link.
      env.DB.prepare(
        `SELECT audience, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND audience IS NOT NULL AND audience <> '' AND ts >= ?
         GROUP BY audience ORDER BY n DESC LIMIT 12`,
      ).bind(since),
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(referrer,''),'(direct)') AS ref, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ?
         GROUP BY ref ORDER BY n DESC LIMIT 10`,
      ).bind(since),
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(country,''),'??') AS country, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ?
         GROUP BY country ORDER BY n DESC LIMIT 15`,
      ).bind(since),
      // City / region (state) — from request.cf, only where Cloudflare resolves them.
      env.DB.prepare(
        `SELECT city, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND city IS NOT NULL AND city <> '' AND ts >= ?
         GROUP BY city ORDER BY n DESC LIMIT 15`,
      ).bind(since),
      env.DB.prepare(
        `SELECT region, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND region IS NOT NULL AND region <> '' AND ts >= ?
         GROUP BY region ORDER BY n DESC LIMIT 15`,
      ).bind(since),
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(device,''),'unknown') AS device, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ? GROUP BY device ORDER BY n DESC`,
      ).bind(since),
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(browser,''),'unknown') AS browser, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ? GROUP BY browser ORDER BY n DESC`,
      ).bind(since),
      // OS breakdown (uses the previously-unused `os`).
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(os,''),'unknown') AS os, COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ? GROUP BY os ORDER BY n DESC`,
      ).bind(since),
      env.DB.prepare(
        `SELECT section, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS unique_viewers
         FROM events WHERE event_type='section_view' AND section IS NOT NULL AND ts >= ?
         GROUP BY section ORDER BY views DESC`,
      ).bind(since),
      // Activity heatmap: day-of-week (0=Sun) x hour-of-day, within window.
      env.DB.prepare(
        `SELECT CAST(strftime('%w', ts/1000,'unixepoch') AS INTEGER) AS dow,
                CAST(strftime('%H', ts/1000,'unixepoch') AS INTEGER) AS hour,
                COUNT(*) AS n
         FROM events WHERE event_type='pageview' AND ts >= ?
         GROUP BY dow, hour`,
      ).bind(since),
      // Session aggregates: count, bounces (single-pageview sessions), avg duration.
      // Only sessions with a session_id (events logged after the 0002 migration).
      env.DB.prepare(
        `SELECT COUNT(*) AS sessions,
                SUM(CASE WHEN pv <= 1 THEN 1 ELSE 0 END) AS bounced,
                AVG(dur) AS avg_dur
         FROM (
           SELECT session_id, COUNT(*) AS pv, (MAX(ts)-MIN(ts)) AS dur
           FROM events
           WHERE event_type='pageview' AND session_id IS NOT NULL AND session_id <> '' AND ts >= ?
           GROUP BY session_id
         )`,
      ).bind(since),
      // New vs returning visitors in the window (returning = seen any event before `since`).
      // NB: "returning" is a reserved keyword in SQLite, so the alias is ret_v.
      env.DB.prepare(
        `SELECT SUM(CASE WHEN is_ret=1 THEN 1 ELSE 0 END) AS ret_v,
                SUM(CASE WHEN is_ret=0 THEN 1 ELSE 0 END) AS new_v
         FROM (
           SELECT e1.visitor_id,
                  (SELECT CASE WHEN EXISTS(
                      SELECT 1 FROM events e2 WHERE e2.visitor_id = e1.visitor_id AND e2.ts < ?
                    ) THEN 1 ELSE 0 END) AS is_ret
           FROM events e1
           WHERE e1.event_type='pageview' AND e1.visitor_id IS NOT NULL AND e1.ts >= ?
           GROUP BY e1.visitor_id
         )`,
      ).bind(since, since),
      // Top interactions: CTA clicks grouped by label (topmate / email / resume / socials).
      env.DB.prepare(
        `SELECT COALESCE(NULLIF(label,''),'(unknown)') AS label, COUNT(*) AS n
         FROM events WHERE event_type='cta_click' AND ts >= ?
         GROUP BY label ORDER BY n DESC LIMIT 12`,
      ).bind(since),
      // Scroll-depth distribution (25/50/75/100 milestones).
      env.DB.prepare(
        `SELECT label, COUNT(*) AS n
         FROM events WHERE event_type='scroll_depth' AND label IS NOT NULL AND label <> '' AND ts >= ?
         GROUP BY label ORDER BY CAST(label AS INTEGER)`,
      ).bind(since),
      // Lead counts: total + unread (ts after the last "mark read").
      env.DB.prepare(
        `SELECT COUNT(*) AS total, SUM(CASE WHEN ts > ? THEN 1 ELSE 0 END) AS unread FROM leads`,
      ).bind(seenTs),
    ]);

  const sa = (sessionAgg.results[0] || {}) as Record<string, unknown>;
  const nr = (newRet.results[0] || {}) as Record<string, unknown>;
  const lc = (leadsCount.results[0] || {}) as Record<string, unknown>;

  return {
    range,
    totals: windowTotals(totals.results[0] as Record<string, unknown>),
    trend: {
      current: windowTotals(cur.results[0] as Record<string, unknown>),
      previous: windowTotals(prev.results[0] as Record<string, unknown>),
    },
    daily: daily.results,
    topPages: topPages.results,
    channels: channels.results,
    audiences: audiences.results,
    referrers: referrers.results,
    countries: countries.results,
    cities: cities.results,
    regions: regions.results,
    devices: devices.results,
    browsers: browsers.results,
    os: os.results,
    sections: sections.results,
    heatmap: heat.results,
    sessions: {
      count: Number(sa.sessions || 0),
      bounced: Number(sa.bounced || 0),
      avgDuration: Math.round(Number(sa.avg_dur || 0) / 1000), // seconds
    },
    visitors: {
      new: Number(nr.new_v || 0),
      returning: Number(nr.ret_v || 0),
    },
    interactions: interactions.results,
    scroll: scroll.results,
    leads: {
      total: Number(lc.total || 0),
      unread: Number(lc.unread || 0),
    },
  };
}

interface UploadedFile {
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

async function uploadResume(request: Request, env: Env): Promise<Response> {
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: 'bad_request' }, 400);
  const entry = form.get('resume') as unknown;
  if (!entry || typeof entry === 'string' || typeof (entry as UploadedFile).arrayBuffer !== 'function') {
    return json({ error: 'no_file' }, 400);
  }
  const file = entry as UploadedFile;
  if (file.size === 0) return json({ error: 'empty_file' }, 400);
  // Kept small since the PDF lives in a D1 row; a resume is far below this.
  if (file.size > 2 * 1024 * 1024) return json({ error: 'too_large_max_2mb' }, 413);

  const buf = await file.arrayBuffer();
  const sig = new Uint8Array(buf.slice(0, 4));
  // Magic bytes: %PDF
  const isPdf = sig[0] === 0x25 && sig[1] === 0x50 && sig[2] === 0x44 && sig[3] === 0x46;
  if (!isPdf) return json({ error: 'not_a_pdf' }, 415);

  const key = env.RESUME_OBJECT_KEY || 'resume.pdf';
  await env.DB.prepare('INSERT OR REPLACE INTO assets (key, data, updated_at) VALUES (?, ?, ?)')
    .bind(key, buf, Date.now())
    .run();
  return json({ ok: true, size: file.size });
}

// Latest leads (newest first) for the dashboard Leads panel.
async function getLeads(env: Env): Promise<Response> {
  const seenTs = await getLeadsSeenTs(env);
  const res = await env.DB.prepare(
    `SELECT id, ts, name, email, message, channel, country, city, region, emailed
     FROM leads ORDER BY ts DESC LIMIT 100`,
  ).all();
  return json({ leads: res.results, seenTs });
}

// CSV helpers ----------------------------------------------------------------
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const head = columns.join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

function csvResponse(name: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}

async function exportCsv(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'events';
  const range = parseRange(request);
  const since = Date.now() - range * 24 * 60 * 60 * 1000;

  if (type === 'leads') {
    const res = await env.DB.prepare(
      `SELECT id, ts, name, email, message, channel, audience, country, city, region, device, browser, os, emailed
       FROM leads ORDER BY ts DESC`,
    ).all();
    const cols = ['id', 'ts', 'name', 'email', 'message', 'channel', 'audience', 'country', 'city', 'region', 'device', 'browser', 'os', 'emailed'];
    return csvResponse('leads.csv', toCsv(res.results as Record<string, unknown>[], cols));
  }

  if (type === 'daily') {
    const res = await env.DB.prepare(
      `SELECT date(ts/1000,'unixepoch') AS day,
              SUM(event_type='pageview') AS pageviews,
              COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) AS uniques,
              SUM(event_type='resume_download') AS downloads
       FROM events WHERE ts >= ? GROUP BY day ORDER BY day`,
    ).bind(since).all();
    const cols = ['day', 'pageviews', 'uniques', 'downloads'];
    return csvResponse('daily.csv', toCsv(res.results as Record<string, unknown>[], cols));
  }

  // Default: raw events within the window.
  const res = await env.DB.prepare(
    `SELECT id, ts, event_type, visitor_id, session_id, path, section, label, referrer,
            country, city, region, device, browser, os, channel, audience
     FROM events WHERE ts >= ? ORDER BY ts DESC`,
  ).bind(since).all();
  const cols = ['id', 'ts', 'event_type', 'visitor_id', 'session_id', 'path', 'section', 'label', 'referrer', 'country', 'city', 'region', 'device', 'browser', 'os', 'channel', 'audience'];
  return csvResponse('events.csv', toCsv(res.results as Record<string, unknown>[], cols));
}

export async function handleAdmin(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
  path: string,
): Promise<Response> {
  const method = request.method;

  // --- Login (public) ---
  if (path === '/admin/login' && method === 'POST') {
    const form = await request.formData().catch(() => null);
    const username = form ? String(form.get('username') || '') : '';
    const password = form ? String(form.get('password') || '') : '';
    if (!(await verifyCredentials(env, username, password))) return redirect('/admin?error=1');
    const token = await createSession(env, username);
    return redirect('/admin', sessionCookie(token, env));
  }

  // --- Logout ---
  if (path === '/admin/logout' && method === 'POST') {
    await destroySession(env, request);
    return redirect('/admin', clearSessionCookie());
  }

  const session = await getSession(env, request);

  // --- Admin UI (same-origin) ---
  if (path === '/admin') {
    if (!session) {
      const hasError = new URL(request.url).searchParams.has('error');
      return html(loginPage(hasError));
    }
    return html(dashboardPage(await getResumeFilename(env)));
  }

  // --- Protected API ---
  if (path.startsWith('/admin/api/')) {
    if (!session) return json({ error: 'unauthorized' }, 401);

    if (path === '/admin/api/stats' && method === 'GET')
      return json(await getStats(env, parseRange(request)));
    if (path === '/admin/api/leads' && method === 'GET') return getLeads(env);
    if (path === '/admin/api/leads/seen' && method === 'POST') {
      await setLeadsSeenTs(env, Date.now());
      return json({ ok: true });
    }
    if (path === '/admin/api/export' && method === 'GET') return exportCsv(request, env);
    if (path === '/admin/api/resume' && method === 'POST') return uploadResume(request, env);

    if (path === '/admin/api/resume-name' && method === 'POST') {
      let raw: unknown = '';
      try {
        raw = ((await request.json()) as any)?.filename;
      } catch {
        /* ignore */
      }
      const name = await setResumeFilename(env, raw);
      if (!name) return json({ error: 'invalid_filename' }, 400);
      return json({ ok: true, filename: name });
    }

    if (path === '/admin/api/reset' && method === 'POST') {
      let confirm = '';
      try {
        confirm = String(((await request.json()) as any)?.confirm || '');
      } catch {
        /* ignore */
      }
      if (confirm !== 'RESET') return json({ error: 'confirmation_required' }, 400);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM events'),
        env.DB.prepare('DELETE FROM daily_rollup'),
      ]);
      return json({ ok: true });
    }

    return json({ error: 'not_found' }, 404);
  }

  return new Response('Not found', { status: 404 });
}
