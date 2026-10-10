import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export function beaconTag(endpoint: string): string {
  const hitUrl = new URL('/hit', endpoint).href;
  return `<script data-analytics>navigator.sendBeacon(${JSON.stringify(hitUrl)},JSON.stringify({p:location.pathname,r:document.referrer}))</script>`;
}

export function withAnalytics(html: string, endpoint: string): string {
  if (html.includes('data-analytics') || !html.includes('</head>')) return html;
  return html.replace('</head>', `  ${beaconTag(endpoint)}\n</head>`);
}

function htmlFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

export function analytics(endpoint: string | undefined): Plugin {
  return {
    name: 'analytics',
    apply: 'build',
    closeBundle() {
      if (!endpoint) return;
      for (const file of htmlFilesUnder(path.join(import.meta.dirname, 'dist'))) {
        writeFileSync(file, withAnalytics(readFileSync(file, 'utf8'), endpoint));
      }
    },
  };
}
