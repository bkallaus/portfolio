// Builds packages/nav/dist/nav.js.
//
// Inlines /sites.json (repo root) and packages/nav/src/nav.css into the
// bundle at build time via esbuild's `define`, so the published nav.js
// never fetches sites.json (or nav.css) at runtime.
//
// Usage: node packages/nav/build.mjs   (run from the repo root, or anywhere
// - paths are resolved relative to this file).

import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const here = import.meta.dirname;

const repoRoot = path.resolve(here, "..", "..");
const sitesJsonPath = path.join(repoRoot, "sites.json");
const navCssPath = path.join(here, "src", "nav.css");
const entryPath = path.join(here, "src", "nav.ts");
const outfile = path.join(here, "dist", "nav.js");

if (!existsSync(sitesJsonPath)) {
  console.error(
    "packages/nav/build.mjs: could not find sites.json at " + sitesJsonPath
  );
  process.exit(1);
}

const sitesRaw = readFileSync(sitesJsonPath, "utf8");
let sites;
try {
  sites = JSON.parse(sitesRaw);
} catch (err) {
  console.error("packages/nav/build.mjs: sites.json is not valid JSON:", err.message);
  process.exit(1);
}

const navCss = readFileSync(navCssPath, "utf8");

await build({
  entryPoints: [entryPath],
  outfile,
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  define: {
    __SITES__: JSON.stringify(sites),
    __NAV_CSS__: JSON.stringify(navCss),
  },
});

console.log("packages/nav/build.mjs: wrote " + outfile);
