import { describe, expect, it } from 'vitest';
import { withBeacon } from './cloudflare-analytics.ts';

describe('withBeacon', () => {
  it('adds the beacon with its token just before </body>', () => {
    const html = withBeacon('<html><body><div></div></body></html>', 'abc123');
    expect(html).toContain(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"abc123"}'></script>\n</body>`,
    );
  });

  it('never adds a second beacon', () => {
    const once = withBeacon('<body></body>', 'abc123');
    expect(withBeacon(once, 'abc123')).toBe(once);
  });

  it('leaves fragments without a body alone', () => {
    expect(withBeacon('<svg></svg>', 'abc123')).toBe('<svg></svg>');
  });
});
