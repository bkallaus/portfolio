import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const appsDir = path.join(import.meta.dirname, '..', 'apps');
const runners = readdirSync(appsDir)
  .map((slug) => path.join(appsDir, slug, 'test', 'run.ts'))
  .filter((runner) => existsSync(runner));

for (const runner of runners) {
  console.log(`\n### ${path.relative(appsDir, runner)}`);
  execFileSync(process.execPath, [runner], { stdio: 'inherit' });
}
