import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { sites } from './sites.ts';

const root = import.meta.dirname;
const hasPage = (dir: string, slug: string) => existsSync(path.join(root, dir, slug, 'index.html'));
const dirsIn = (dir: string) =>
  readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

describe('sites.json', () => {
  const slugs = sites.map((site) => site.slug);

  it('lists each slug once', () => {
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(slugs)('%s has a page at apps/<slug>/ or public/<slug>/', (slug) => {
    expect(hasPage('apps', slug) || hasPage('public', slug)).toBe(true);
  });

  it('has a row for every app and every static page', () => {
    const pages = [...dirsIn('apps'), ...dirsIn('public').filter((slug) => hasPage('public', slug))];
    expect(pages.filter((slug) => !slugs.includes(slug))).toEqual([]);
  });

  it('never serves the same slug from both apps/ and public/', () => {
    const both = slugs.filter((slug) => hasPage('apps', slug) && hasPage('public', slug));
    expect(both).toEqual([]);
  });
});
