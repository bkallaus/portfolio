import rows from './sites.json' with { type: 'json' };

export type Tier = 'featured' | 'experiment' | 'hidden';

export type Tech = 'react' | 'typescript' | 'javascript' | 'html5';

export type Site = {
  slug: string;
  title: string;
  blurb?: string;
  tier?: Tier;
  tech?: Tech[];
};

export const HUB_SLUG = 'portfolio';

export const sites: Site[] = rows as Site[];

export const tierOf = (site: Site): Tier => site.tier ?? 'experiment';

export const urlFor = (slug: string): string => (slug === HUB_SLUG ? '/' : `/${slug}/`);

export const listedIn = (tier: Tier): Site[] =>
  sites.filter((site) => site.slug !== HUB_SLUG && tierOf(site) === tier);
