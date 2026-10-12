import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export function withBeacon(html: string, token: string): string {
  if (html.includes('static.cloudflareinsights.com') || !html.includes('</body>')) return html;
  const beacon = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token })}'></script>`;
  return html.replace('</body>', `${beacon}\n</body>`);
}

function htmlFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

export function cloudflareWebAnalytics(token: string | undefined): Plugin {
  let outDir = '';
  return {
    name: 'cloudflare-web-analytics',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      if (!token) return;
      for (const file of htmlFilesUnder(outDir)) {
        writeFileSync(file, withBeacon(readFileSync(file, 'utf8'), token));
      }
    },
  };
}
