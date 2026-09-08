/**
 * Generates lib/resumeExamplesIndex.generated.json — the SEARCH index for the
 * résumé examples catalog.
 *
 * Why a generated file and not a derivation at runtime:
 * components/ResumeExamplesData.ts is ~353 KB of résumé bodies, and any import
 * from it pulls the whole module into the bundle (the catalog maps over the
 * array at runtime, so nothing is tree-shakeable). The Template Builder needs
 * to SEARCH the 60 examples on its cold open, and it only needs scalars to do
 * that: title, category, level, score, tags, featured skills. Those live here,
 * ~10 KB, and the heavy example body is dynamically imported only when someone
 * actually picks one.
 *
 * The id is a slug of the title; all 60 titles are unique and a test pins that
 * the index and the catalog agree in BOTH directions, so an example cannot
 * ship without a row and a row cannot point at an example that was deleted.
 *
 * Run: node scripts/buildResumeExamplesIndex.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "components/ResumeExamplesData.ts"), "utf8");

export function exampleSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Each entry starts at a 4-space `title:` line; take everything up to the next
// one (or EOF) as that entry's block so `score`/`tags` cannot be read off a
// neighbour.
const starts = [...src.matchAll(/^ {4}title:\s*"([^"]+)"/gm)];
const rows = starts.map((m, i) => {
  const from = m.index;
  const to = i + 1 < starts.length ? starts[i + 1].index : src.length;
  const block = src.slice(from, to);
  const pick = (re) => (block.match(re)?.[1] ?? "").trim();

  const tagsRaw = block.match(/^ {4}tags:\s*\[([^\]]*)\]/m)?.[1] ?? "";
  const tags = [...tagsRaw.matchAll(/"([^"]+)"/g)].map((t) => t[1]);

  // Featured skills live inside the JSON-ish `skills` object of the résumé body.
  const featuredRaw = block.match(/"featuredSkills":\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const skills = [...featuredRaw.matchAll(/"skill":\s*"([^"]*)"/g)]
    .map((s) => s[1].trim())
    .filter(Boolean);

  return {
    id: exampleSlug(m[1]),
    title: m[1],
    category: pick(/^ {4}category:\s*"([^"]+)"/m),
    level: pick(/^ {4}level:\s*"([^"]+)"/m),
    desc: pick(/^ {4}desc:\s*"([^"]+)"/m),
    score: Number(block.match(/^ {4}score:\s*(\d+)/m)?.[1] ?? 0),
    tags,
    skills,
  };
});

const bad = rows.filter((r) => !r.id || !r.title || !r.category || !r.level || !r.score);
if (bad.length) {
  console.error("Incomplete rows parsed:", bad.map((b) => b.title || "(no title)"));
  process.exit(1);
}
if (new Set(rows.map((r) => r.id)).size !== rows.length) {
  console.error("Duplicate example ids — titles must be unique.");
  process.exit(1);
}

const out = join(root, "lib/resumeExamplesIndex.generated.json");
writeFileSync(out, `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), examples: rows }, null, 2)}\n`);
console.log(`Wrote ${rows.length} rows to ${out}`);
