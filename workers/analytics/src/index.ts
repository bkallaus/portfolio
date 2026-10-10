import { dashboard } from './dashboard.ts';
import type { Env } from './env.ts';
import { parseHit } from './hit.ts';
import { sinceDay } from './range.ts';

export { Counter } from './counter.ts';

function authorized(request: Request, token: string): boolean {
  if (!token) return false;
  const encoder = new TextEncoder();
  const given = encoder.encode(request.headers.get('Authorization') ?? '');
  const expected = encoder.encode(`Bearer ${token}`);
  return given.byteLength === expected.byteLength && crypto.subtle.timingSafeEqual(given, expected);
}

function counterFor(env: Env) {
  return env.COUNTER.get(env.COUNTER.idFromName(env.SITE_HOST));
}

async function recordHit(request: Request, env: Env): Promise<Response> {
  const hit = parseHit(
    {
      body: await request.text(),
      origin: request.headers.get('Origin'),
      userAgent: request.headers.get('User-Agent'),
    },
    env.SITE_HOST,
    new Date(),
  );
  if (hit) await counterFor(env).record(hit);
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': `https://${env.SITE_HOST}` },
  });
}

async function readStats(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env.STATS_TOKEN)) return new Response('Unauthorized', { status: 401 });
  const since = sinceDay(new URL(request.url).searchParams.get('days'), new Date());
  const stats = await counterFor(env).stats(since);
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === 'POST' && pathname === '/hit') return recordHit(request, env);
    if (request.method === 'GET' && pathname === '/stats') return readStats(request, env);
    if (request.method === 'GET' && pathname === '/') {
      return new Response(dashboard, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
