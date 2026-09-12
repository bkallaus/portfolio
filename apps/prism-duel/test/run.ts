export {};

const suites = ["./cards.test.ts", "./engine.test.ts", "./abilities.test.ts", "./fuzz.test.ts"];
let crashed = false;
for (const suite of suites) {
  console.log(`\n=== ${suite.replace("./", "")} ===`);
  try {
    await import(suite);
  } catch (error) {
    crashed = true;
    console.log("SUITE CRASHED:", (error as Error).stack ?? (error as Error).message);
  }
}
if (crashed) process.exit(1);
