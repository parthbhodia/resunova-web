#!/usr/bin/env node
/** Fetch the freshest public jobs and commit them to the static Next.js export. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, "..", "lib", "jobsSeoData.generated.json");
const apiBase = (
  process.env.SEO_DATA_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.resunova.io"
).replace(/\/$/, "");
const endpoint = `${apiBase}/api/seo/jobs?max_age_days=30&max_postings=1000`;

async function main() {
  let body;
  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    body = await response.json();
  } catch (error) {
    console.warn(`[build-jobs-seo-data] Could not fetch ${endpoint}: ${error?.message ?? error}`);
    console.warn("[build-jobs-seo-data] Keeping the committed job snapshot.");
    return;
  }

  const jobs = Array.isArray(body?.jobs)
    ? body.jobs.filter((job) => job?.id && job?.title && job?.company && job?.description && job?.url)
    : [];
  if (jobs.length === 0) {
    console.warn("[build-jobs-seo-data] Endpoint returned no usable jobs; keeping the committed snapshot.");
    return;
  }

  const next = `${JSON.stringify({ generatedAt: body.generatedAt ?? new Date().toISOString(), jobs }, null, 2)}\n`;
  let previous = "";
  try { previous = readFileSync(outFile, "utf8"); } catch { /* first build */ }
  if (previous === next) return;
  writeFileSync(outFile, next, "utf8");
  console.log(`[build-jobs-seo-data] Wrote ${jobs.length} public jobs.`);
}

main();
