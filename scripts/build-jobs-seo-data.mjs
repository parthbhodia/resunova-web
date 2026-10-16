#!/usr/bin/env node
/** Fetch the freshest public jobs and commit them to the static Next.js export. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decideSnapshot, usableJobs } from "./jobsSnapshotPolicy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, "..", "lib", "jobsSeoData.generated.json");
const apiBase = (
  process.env.SEO_DATA_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.resunova.io"
).replace(/\/$/, "");
// A constant window is safe again: the deployed /api/seo/jobs carries
// _CACHE_TTL_SECONDS (900s), verified in production on 2026-09-10 — two
// requests to the same process 18m34s apart returned different `generatedAt`
// values and each issued its own database query. Before that fix the endpoint
// memoized forever on these exact params, which is why this used to alternate
// max_age_days by UTC day to force a different cache key.
const MAX_AGE_DAYS = 30;
const MAX_POSTINGS = 1000;
const endpoint =
  `${apiBase}/api/seo/jobs?max_age_days=${MAX_AGE_DAYS}&max_postings=${MAX_POSTINGS}`;

function readPrevious() {
  try {
    const raw = readFileSync(outFile, "utf8");
    return { raw, count: usableJobs(JSON.parse(raw)?.jobs).length };
  } catch {
    return { raw: "", count: 0 };
  }
}

async function main() {
  const previous = readPrevious();
  let body;
  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    body = await response.json();
  } catch (error) {
    console.warn(`[build-jobs-seo-data] Could not fetch ${endpoint}: ${error?.message ?? error}`);
    console.warn(`[build-jobs-seo-data] Keeping the committed snapshot (${previous.count} jobs).`);
    return;
  }

  const jobs = usableJobs(body?.jobs);
  const verdict = decideSnapshot({
    incomingCount: jobs.length,
    previousCount: previous.count,
    force: process.env.SEO_JOBS_FORCE === "1",
  });
  if (!verdict.accept) {
    // Loud, because the failure this guards is silent by nature: the build
    // succeeds either way and the pages simply stop existing.
    console.warn(`[build-jobs-seo-data] REFUSED to shrink the published set: ${verdict.reason}.`);
    console.warn("[build-jobs-seo-data] Upstream discovery is probably stale — see .github/workflows/jobs-discovery.yml in resunova-api.");
    return;
  }

  const next = `${JSON.stringify({ generatedAt: body.generatedAt ?? new Date().toISOString(), jobs }, null, 2)}\n`;
  if (previous.raw === next) {
    console.log(`[build-jobs-seo-data] Unchanged (${jobs.length} public jobs).`);
    return;
  }
  writeFileSync(outFile, next, "utf8");
  console.log(`[build-jobs-seo-data] Wrote ${jobs.length} public jobs — ${verdict.reason}.`);
}

main();
