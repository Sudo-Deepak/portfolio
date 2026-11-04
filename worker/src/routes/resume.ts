import type { Env } from '../types';
import { corsHeaders } from '../lib/cors';
import { insertStmt } from '../lib/db';
import { isBot, parseDevice, parseBrowser, parseOS } from '../lib/ua';

// D1 returns BLOB columns as ArrayBuffer (or, in some versions, number[]).
function toArrayBuffer(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) return (data as ArrayBufferView).buffer as ArrayBuffer;
  if (Array.isArray(data)) return new Uint8Array(data as number[]).buffer;
  return null;
}

// Serves the latest uploaded resume from D1. This is the canonical download
// endpoint the public site links to, so the file can be replaced from the admin
// panel with no redeploy.
export async function handleResume(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const cors = corsHeaders(env, request);
  const key = env.RESUME_OBJECT_KEY || 'resume.pdf';
  const row = await env.DB.prepare('SELECT data, updated_at FROM assets WHERE key = ?')
    .bind(key)
    .first<{ data: unknown; updated_at: number }>();

  const buf = row ? toArrayBuffer(row.data) : null;
  if (!buf) {
    return new Response('Resume not uploaded yet.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain', ...cors },
    });
  }

  // Server-side (canonical) download count, best-effort, bots excluded.
  const ua = request.headers.get('User-Agent') || '';
  if (!isBot(ua)) {
    const country = ((request.cf?.country as string) || 'XX').slice(0, 4);
    try {
      await insertStmt(env, {
        ts: Date.now(),
        event_type: 'resume_download',
        visitor_id: null,
        path: '/resume',
        section: null,
        referrer: null,
        country,
        device: parseDevice(ua),
        browser: parseBrowser(ua),
        os: parseOS(ua),
      }).run();
    } catch {
      // best-effort — don't block the download on a logging failure
    }
  }

  const filename = env.RESUME_FILENAME || 'resume.pdf';
  const headers = new Headers(cors);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="${filename}"`);
  headers.set('Cache-Control', 'public, max-age=300');
  headers.set('ETag', `"${row?.updated_at ?? 0}"`);

  return new Response(buf, { headers });
}
