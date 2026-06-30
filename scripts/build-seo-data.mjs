#!/usr/bin/env node
/**
 * Build-time SEO data generator for /resume-examples/[role]/.
 *
 * Fetches per-role_family aggregates from resunova-api and writes them to
 * lib/roleResumeData.generated.json. At module load, lib/roleResumeData.ts
 * overlays this live data (skills / salary / work-model / posting counts) onto
 * the hand-authored editorial seed, keyed by `roleFamily`. Editorial fields
 * (intro, scored example, FAQ) are never touched by this script.
 *
 * Run BEFORE `next build` so the static export bakes the fresh data in:
 *   node scripts/build-seo-data.mjs
 *   SEO_DATA_API_BASE=https://api.resunova.io node scripts/build-seo-data.mjs
 *
 * SAFE BY DESIGN: if the endpoint is missing/unreachable/returns nothing usable,
 * the script logs a warning and exits 0 WITHOUT touching the committed JSON, so
 * wiring it into CI today cannot break the build before the endpoint ships.
 *
 * Expected response from GET /api/seo/role-stats:
 *   { roles: [ { roleFamily, postingsAnalyzed,
 *               topSkills: [{ name, sharePct }],
 *               salary: { medianUsd, rangeLabel } | null,
 *               workModel: { remotePct, hybridPct, onsitePct } | null }, ... ],
 *     postingsAnalyzed }
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "lib", "roleResumeData.generated.json");

const API_BASE = (
  process.env.SEO_DATA_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.resunova.io"
).replace(/\/$/, "");
const ENDPOINT = `${API_BASE}/api/seo/role-stats`;

function warnAndKeep(msg) {
  console.warn(`[build-seo-data] ${msg}`);
  console.warn("[build-seo-data] Keeping committed lib/roleResumeData.generated.json (no changes).");
  process.exit(0);
}

function isUsableRole(r) {
  return r && typeof r.roleFamily === "string" && Array.isArray(r.topSkills) && r.topSkills.length > 0;
}

async function main() {
  let body;
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) warnAndKeep(`GET ${ENDPOINT} → HTTP ${res.status}.`);
    body = await res.json();
  } catch (err) {
    warnAndKeep(`Could not reach ${ENDPOINT}: ${err?.message ?? err}.`);
  }

  const roles = Array.isArray(body?.roles) ? body.roles.filter(isUsableRole) : [];
  if (roles.length === 0) warnAndKeep("Endpoint returned no usable role data.");

  const byFamily = {};
  for (const r of roles) {
    byFamily[r.roleFamily] = {
      postingsAnalyzed: r.postingsAnalyzed,
      topSkills: r.topSkills,
      salary: r.salary ?? null,
      workModel: r.workModel ?? null,
      topTitles: Array.isArray(r.topTitles) ? r.topTitles : [],
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    postingsAnalyzed: typeof body?.postingsAnalyzed === "number" ? body.postingsAnalyzed : null,
    byFamily,
  };

  // Only rewrite when the data actually changed (keeps the diff/commit clean).
  const next = JSON.stringify(out, null, 2) + "\n";
  let prev = "";
  try {
    prev = readFileSync(OUT_FILE, "utf8");
  } catch {
    /* first run — file may not exist */
  }
  const prevByFamily = (() => {
    try {
      return JSON.stringify(JSON.parse(prev).byFamily);
    } catch {
      return null;
    }
  })();
  if (prevByFamily === JSON.stringify(byFamily)) {
    console.log(`[build-seo-data] ${Object.keys(byFamily).length} families unchanged — leaving JSON as-is.`);
    return;
  }

  writeFileSync(OUT_FILE, next, "utf8");
  console.log(
    `[build-seo-data] Wrote ${Object.keys(byFamily).length} role families to lib/roleResumeData.generated.json.`,
  );
}

main();
