/* Runs every suite in order and fails loudly if any of them do. */
const suites = ["./engine.test.mjs", "./wonders.test.mjs", "./edges.test.mjs"];
let failed = false;
const realLog = console.log;
for (const s of suites) {
  realLog(`\n=== ${s.replace("./", "")} ===`);
  try { await import(s); }
  catch (e) { failed = true; realLog("SUITE CRASHED:", e.message); }
}
if (failed) process.exit(1);
