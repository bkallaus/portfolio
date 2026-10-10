import type { Counter } from './counter.ts';

export interface Env {
  COUNTER: DurableObjectNamespace<Counter>;
  SITE_HOST: string;
  STATS_TOKEN: string;
}
