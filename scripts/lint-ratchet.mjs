#!/usr/bin/env node
/**
 * Lint ratchet.
 *
 * `eslint` exits non-zero on the first error, and this repo has hundreds of
 * pre-existing ones, so a plain lint step would be red forever and get ignored
 * within a week. Instead this compares the current error count against a
 * committed baseline: a change may not make things worse, and whenever it makes
 * things better the baseline comes down with it.
 *
 * Errors only. Warnings are an order of magnitude more numerous and mostly
 * advisory; folding them in would swamp the signal.
 *
 *   node scripts/lint-ratchet.mjs           # check against the baseline
 *   node scripts/lint-ratchet.mjs --update  # write the current count as the new baseline
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASELINE_FILE = new URL("../.eslint-baseline.json", import.meta.url);
const update = process.argv.includes("--update");

function runEslint() {
  // eslint exits 1 when it finds errors, which is the normal case here, so a
  // non-zero status is not a failure — only an empty/unparseable stdout is.
  let stdout;
  try {
    stdout = execFileSync("npx", ["eslint", ".", "-f", "json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch (err) {
    stdout = err.stdout ?? "";
    if (!stdout.trim()) {
      console.error("lint-ratchet: eslint produced no output; treating as a hard failure.");
      process.exit(2);
    }
  }
  return JSON.parse(stdout);
}

const results = runEslint();
const errors = results.reduce((n, f) => n + f.errorCount, 0);
const warnings = results.reduce((n, f) => n + f.warningCount, 0);

if (update) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ errors }, null, 2) + "\n");
  console.log(`lint-ratchet: baseline set to ${errors} error(s).`);
  process.exit(0);
}

if (!existsSync(BASELINE_FILE)) {
  console.error("lint-ratchet: no .eslint-baseline.json. Create one with --update.");
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")).errors;

if (errors > baseline) {
  const byRule = new Map();
  for (const file of results) {
    for (const m of file.messages) {
      if (m.severity !== 2) continue;
      byRule.set(m.ruleId, (byRule.get(m.ruleId) ?? 0) + 1);
    }
  }
  const top = [...byRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  console.error(`\nlint-ratchet: ${errors} errors, baseline is ${baseline} (+${errors - baseline}).`);
  console.error("This change introduces new lint errors. Most common rules right now:\n");
  for (const [rule, n] of top) console.error(`  ${String(n).padStart(4)}  ${rule}`);
  console.error("\nFix the new ones. Raising the baseline is not the fix.\n");
  process.exit(1);
}

if (errors < baseline) {
  console.log(
    `lint-ratchet: ${errors} errors, down from ${baseline}. `
    + "Lower the baseline with:\n\n  node scripts/lint-ratchet.mjs --update\n",
  );
} else {
  console.log(`lint-ratchet: ${errors} errors, baseline held (${warnings} warnings).`);
}
