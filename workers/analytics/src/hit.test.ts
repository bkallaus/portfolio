import { describe, expect, it } from 'vitest';
import { normalizePath, parseHit, referrerHost } from './hit.ts';

const site = 'ben.kallaus.me';
const now = new Date('2026-10-10T15:00:00Z');
const browser = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

function request(body: unknown, overrides: Partial<{ origin: string | null; userAgent: string | null }> = {}) {
  return {
    body: JSON.stringify(body),
    origin: `https://${site}`,
    userAgent: browser,
    ...overrides,
  };
}

describe('parseHit', () => {
  it('records the day, path and external referrer of a page view', () => {
    expect(parseHit(request({ p: '/quick/', r: 'https://news.ycombinator.com/item?id=1' }), site, now)).toEqual({
      day: '2026-10-10',
      path: '/quick/',
      referrer: 'news.ycombinator.com',
    });
  });

  it('ignores views posted from another origin', () => {
    expect(parseHit(request({ p: '/' }, { origin: 'https://evil.example' }), site, now)).toBeNull();
    expect(parseHit(request({ p: '/' }, { origin: null }), site, now)).toBeNull();
  });

  it('ignores crawlers and clients without a user agent', () => {
    expect(parseHit(request({ p: '/' }, { userAgent: 'Googlebot/2.1' }), site, now)).toBeNull();
    expect(parseHit(request({ p: '/' }, { userAgent: null }), site, now)).toBeNull();
  });

  it('ignores bodies that are not a page view', () => {
    expect(parseHit({ body: 'nope', origin: `https://${site}`, userAgent: browser }, site, now)).toBeNull();
    expect(parseHit(request(null), site, now)).toBeNull();
    expect(parseHit(request({ p: 42 }), site, now)).toBeNull();
  });
});

describe('normalizePath', () => {
  it('folds index.html, query strings and repeated slashes into one path', () => {
    expect(normalizePath('/duel/play/index.html')).toBe('/duel/play/');
    expect(normalizePath('/quick/?tab=base64#top')).toBe('/quick/');
    expect(normalizePath('//quick//')).toBe('/quick/');
  });

  it('rejects anything that is not a site-relative path', () => {
    expect(normalizePath('quick')).toBeNull();
    expect(normalizePath(`/${'a'.repeat(300)}`)).toBeNull();
    expect(normalizePath(undefined)).toBeNull();
  });
});

describe('referrerHost', () => {
  it('keeps only the host of an outside referrer', () => {
    expect(referrerHost('https://www.google.com/search?q=ben', site)).toBe('www.google.com');
  });

  it('drops internal navigation and missing referrers', () => {
    expect(referrerHost(`https://${site}/quick/`, site)).toBeNull();
    expect(referrerHost('', site)).toBeNull();
    expect(referrerHost('not a url', site)).toBeNull();
  });
});
