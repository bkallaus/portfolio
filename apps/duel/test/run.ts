/* Runs every suite in order and fails loudly if any of them do. */
export {};

const suites = ["./engine.test.ts", "./wonders.test.ts", "./edges.test.ts"];
let failed = false;
const realLog = console.log;
for (const s of suites) {
  realLog(`\n=== ${s.replace("./", "")} ===`);
  try { await import(s); }
  catch (e) { failed = true; realLog("SUITE CRASHED:", (e as Error).message); }
}
if (failed) process.exit(1);
