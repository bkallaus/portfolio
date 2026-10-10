export type Hit = {
  day: string;
  path: string;
  referrer: string | null;
};

export type HitRequest = {
  body: string;
  origin: string | null;
  userAgent: string | null;
};

const automated = /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|http/i;
const maxPathLength = 200;

function readJson(body: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(body);
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > maxPathLength) return null;
  const [pathname] = raw.split(/[?#]/);
  const withoutIndex = pathname.replace(/\/index\.html$/, '/');
  return withoutIndex.replace(/\/{2,}/g, '/');
}

export function referrerHost(raw: unknown, siteHost: string): string | null {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    const host = new URL(raw).hostname;
    return host === siteHost || host === '' ? null : host;
  } catch {
    return null;
  }
}

export function parseHit(request: HitRequest, siteHost: string, now: Date): Hit | null {
  if (request.origin !== `https://${siteHost}`) return null;
  if (!request.userAgent || automated.test(request.userAgent)) return null;
  const payload = readJson(request.body);
  if (!payload) return null;
  const path = normalizePath(payload.p);
  if (!path) return null;
  return {
    day: now.toISOString().slice(0, 10),
    path,
    referrer: referrerHost(payload.r, siteHost),
  };
}
