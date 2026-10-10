import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env.ts';
import type { Hit } from './hit.ts';

export type Stats = {
  since: string;
  total: number;
  daily: { day: string; views: number }[];
  pages: { path: string; views: number }[];
  referrers: { host: string; views: number }[];
};

const rowLimit = 50;

export class Counter extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const { sql } = ctx.storage;
    sql.exec(
      'CREATE TABLE IF NOT EXISTS views (day TEXT NOT NULL, path TEXT NOT NULL, views INTEGER NOT NULL, PRIMARY KEY (day, path))',
    );
    sql.exec(
      'CREATE TABLE IF NOT EXISTS referrers (day TEXT NOT NULL, host TEXT NOT NULL, views INTEGER NOT NULL, PRIMARY KEY (day, host))',
    );
  }

  record(hit: Hit): void {
    const { sql } = this.ctx.storage;
    sql.exec(
      'INSERT INTO views (day, path, views) VALUES (?, ?, 1) ON CONFLICT (day, path) DO UPDATE SET views = views + 1',
      hit.day,
      hit.path,
    );
    if (hit.referrer) {
      sql.exec(
        'INSERT INTO referrers (day, host, views) VALUES (?, ?, 1) ON CONFLICT (day, host) DO UPDATE SET views = views + 1',
        hit.day,
        hit.referrer,
      );
    }
  }

  stats(since: string): Stats {
    const { sql } = this.ctx.storage;
    const daily = sql
      .exec<{ day: string; views: number }>(
        'SELECT day, SUM(views) AS views FROM views WHERE day >= ? GROUP BY day ORDER BY day',
        since,
      )
      .toArray();
    const pages = sql
      .exec<{ path: string; views: number }>(
        'SELECT path, SUM(views) AS views FROM views WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT ?',
        since,
        rowLimit,
      )
      .toArray();
    const referrers = sql
      .exec<{ host: string; views: number }>(
        'SELECT host, SUM(views) AS views FROM referrers WHERE day >= ? GROUP BY host ORDER BY views DESC LIMIT ?',
        since,
        rowLimit,
      )
      .toArray();
    const total = daily.reduce((sum, row) => sum + row.views, 0);
    return { since, total, daily, pages, referrers };
  }
}
