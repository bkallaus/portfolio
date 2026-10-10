import { describe, expect, it } from 'vitest';
import { beaconTag, withAnalytics } from './analytics.ts';

const endpoint = 'https://analytics.example.workers.dev';

describe('withAnalytics', () => {
  it('adds the beacon just before </head>', () => {
    const html = '<html><head><title>x</title></head><body></body></html>';
    expect(withAnalytics(html, endpoint)).toBe(
      `<html><head><title>x</title>  ${beaconTag(endpoint)}\n</head><body></body></html>`,
    );
  });

  it('beacons to the worker hit route', () => {
    expect(beaconTag(endpoint)).toContain('"https://analytics.example.workers.dev/hit"');
    expect(beaconTag(`${endpoint}/`)).toContain('"https://analytics.example.workers.dev/hit"');
  });

  it('rejects an endpoint that is not a URL', () => {
    expect(() => beaconTag('</script><script>alert(1)')).toThrow();
  });

  it('never adds the beacon twice', () => {
    const once = withAnalytics('<head></head>', endpoint);
    expect(withAnalytics(once, endpoint)).toBe(once);
  });

  it('leaves fragments without a head alone', () => {
    expect(withAnalytics('<div></div>', endpoint)).toBe('<div></div>');
  });
});
