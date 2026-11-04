import type { Env } from './types';
import { preflight } from './lib/cors';
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
      return new Response('portfolio-backend ok', { headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
