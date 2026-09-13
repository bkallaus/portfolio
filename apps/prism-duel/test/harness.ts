let passed = 0;
let failed = 0;

export function check(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
}

export function equal<T>(label: string, actual: T, expected: T): void {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  check(label, same, same ? "" : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export function throws(label: string, run: () => unknown): void {
  try {
    run();
    check(label, false, "expected a throw");
  } catch {
    check(label, true);
  }
}

export function report(suite: string): void {
  console.log(`  ${suite}: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
  passed = 0;
  failed = 0;
}
