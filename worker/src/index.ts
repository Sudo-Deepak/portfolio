import type { Env } from './types';
import { preflight, corsHeaders } from './lib/cors';
import { handleCollect } from './routes/collect';
import { handleResume } from './routes/resume';
import { handleAdmin } from './routes/admin';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;

    if (method === 'OPTIONS') return preflight(env, request);

    if (path === '/collect' && method === 'POST') return handleCollect(request, env, ctx);
    if (path === '/resume' && method === 'GET') return handleResume(request, env, ctx);
    if (path === '/admin' || path.startsWith('/admin/')) return handleAdmin(request, env, ctx, path);

    if (path === '/' || path === '/health') {
      // CORS so the public site can probe reachability before upgrading the
      // resume link to this Worker's /resume endpoint.
      return new Response('portfolio-backend ok', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders(env, request) },
      });
    }

    return new Response('Not found', { status: 404 });
  },

  // Nightly maintenance (Cron Trigger, see wrangler.toml). Keeps the raw `events`
  // table bounded so storage and per-request row-reads stay well inside D1 free
  // limits, while preserving long-term daily totals in `daily_rollup`.
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const RETENTION_DAYS = 180;
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    await env.DB.batch([
      // 1) Roll up every day currently in `events` into daily_rollup (idempotent).
      //    Days are captured here long before they age past the retention window,
      //    so these totals survive the prune below.
      env.DB.prepare(
        `INSERT INTO daily_rollup (day, pageviews, uniques, downloads)
         SELECT date(ts/1000,'unixepoch') AS day,
                SUM(event_type='pageview'),
                COUNT(DISTINCT CASE WHEN event_type='pageview' THEN visitor_id END),
                SUM(event_type='resume_download')
         FROM events
         GROUP BY day
         ON CONFLICT(day) DO UPDATE SET
           pageviews = excluded.pageviews,
           uniques   = excluded.uniques,
           downloads = excluded.downloads`,
      ),
      // 2) Prune raw events older than the retention window.
      env.DB.prepare('DELETE FROM events WHERE ts < ?').bind(cutoff),
    ]);
  },
} satisfies ExportedHandler<Env>;
