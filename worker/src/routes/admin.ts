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

async function getStats(env: Env) {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const [totals, daily, referrers, countries, devices, browsers, sections] = await env.DB.batch([
    env.DB.prepare(
      `SELECT
         SUM(event_type='pageview')        AS pageviews,
         COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END) AS uniques,
         SUM(event_type='resume_download') AS downloads
       FROM events`,
    ),
    env.DB.prepare(
      `SELECT date(ts/1000,'unixepoch') AS day, COUNT(*) AS views
       FROM events WHERE event_type='pageview' AND ts >= ?
       GROUP BY day ORDER BY day`,
    ).bind(since),
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(referrer,''),'(direct)') AS ref, COUNT(*) AS n
       FROM events WHERE event_type='pageview'
       GROUP BY ref ORDER BY n DESC LIMIT 10`,
    ),
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(country,''),'??') AS country, COUNT(*) AS n
       FROM events WHERE event_type='pageview'
       GROUP BY country ORDER BY n DESC LIMIT 15`,
    ),
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(device,''),'unknown') AS device, COUNT(*) AS n
       FROM events WHERE event_type='pageview' GROUP BY device ORDER BY n DESC`,
    ),
    env.DB.prepare(
      `SELECT COALESCE(NULLIF(browser,''),'unknown') AS browser, COUNT(*) AS n
       FROM events WHERE event_type='pageview' GROUP BY browser ORDER BY n DESC`,
    ),
    env.DB.prepare(
      `SELECT section, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS unique_viewers
       FROM events WHERE event_type='section_view' AND section IS NOT NULL
       GROUP BY section ORDER BY views DESC`,
    ),
  ]);

  const t = (totals.results[0] || {}) as Record<string, unknown>;
  return {
    totals: {
      pageviews: Number(t.pageviews || 0),
      uniques: Number(t.uniques || 0),
      downloads: Number(t.downloads || 0),
    },
    daily: daily.results,
    referrers: referrers.results,
    countries: countries.results,
    devices: devices.results,
    browsers: browsers.results,
    sections: sections.results,
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
    return html(dashboardPage(env.RESUME_FILENAME || 'resume.pdf'));
  }

  // --- Protected API ---
  if (path.startsWith('/admin/api/')) {
    if (!session) return json({ error: 'unauthorized' }, 401);

    if (path === '/admin/api/stats' && method === 'GET') return json(await getStats(env));
    if (path === '/admin/api/resume' && method === 'POST') return uploadResume(request, env);

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
