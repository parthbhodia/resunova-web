/**
 * What the user can hand the fix writer, and what we do with it.
 *
 * A fix row used to end at "we couldn't write this one". The user is the one
 * person who knows what they actually did, and that state took no input from
 * them. This module is the input side: facts and tools they vouch for, a
 * steering line for the writer, a draft built from their own words when the
 * writer still has nothing, a role to hang a new bullet on, and the Skills
 * group a tool belongs in.
 *
 * Pure. The page owns the fetch, the apply and the structured write.
 */

import type { ConfirmedFact } from "@/lib/tailorConfirmFacts";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";
import { skillAlreadyListed } from "@/lib/skillsEntry";

/** Everything the user typed for one fix. */
export interface FixGuidance {
  /** Where, what, outcome. Null when they only named tools or gave a note. */
  facts: ConfirmedFact | null;
  /** Tools or technologies they say they used for this requirement. */
  tools: string[];
  /** Free text for the writer: wording to use, what to mention, what to avoid. */
  steer: string;
}

export function emptyFixGuidance(): FixGuidance {
  return { facts: null, tools: [], steer: "" };
}

export function guidanceIsEmpty(g: FixGuidance | null | undefined): boolean {
  if (!g) return true;
  return !g.facts?.what.trim() && g.tools.length === 0 && !g.steer.trim();
}

/** "AWS, Terraform; Docker" → ["AWS", "Terraform", "Docker"]. */
export function parseToolList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/[,;\n]+/)) {
    const tool = part.trim().replace(/^[-•·*]+\s*/, "");
    if (!tool) continue;
    const key = tool.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tool);
  }
  return out;
}

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * The lines appended to `gap_notes`.
 *
 * Tools the user names are theirs to vouch for, so the writer is told it may
 * use them. The steering line is quoted as guidance, not as a fact.
 */
export function guidanceNotes(g: FixGuidance | null | undefined): string {
  if (!g) return "";
  const lines: string[] = [];
  if (g.tools.length) {
    lines.push(
      `The candidate confirms they used ${joinList(g.tools)} for this. `
      + "These are theirs to vouch for; you may name them in the rewrite.",
    );
  }
  const steer = g.steer.trim();
  if (steer) lines.push(`Guidance from the candidate: ${steer}`);
  return lines.join("\n");
}

/**
 * The confirmed fact sent to the API.
 *
 * Tools ride inside `what` so the server's provenance check sees them next to
 * the claim they belong to. Tools alone are still a claim: they are the
 * candidate's to vouch for, including ones the résumé never named. Returns
 * null only when there is nothing to vouch for.
 */
export function factsForRequest(g: FixGuidance | null | undefined): ConfirmedFact | null {
  const what = g?.facts?.what.trim() ?? "";
  const tools = g?.tools ?? [];
  if (!what && tools.length === 0) return null;
  const unused = tools.filter((t) => !what.toLowerCase().includes(t.toLowerCase()));
  const claim = what
    ? (unused.length ? `${what} (using ${unused.join(", ")})` : what)
    : `Used ${joinList(tools)}`;
  return {
    where: g?.facts?.where.trim() ?? "",
    what: claim,
    outcome: g?.facts?.outcome.trim() ?? "",
  };
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * A bullet written from the user's own words, for when the writer still has
 * nothing. Deliberately plain: it frames what they typed and adds no claim of
 * its own. They edit it before it lands.
 */
export function draftBulletFromGuidance(g: FixGuidance | null | undefined): string {
  if (!g) return "";
  const what = g.facts?.what.trim().replace(/[.]+$/, "") ?? "";
  const outcome = g.facts?.outcome.trim().replace(/[.]+$/, "") ?? "";
  const tools = g.tools.filter((t) => !what.toLowerCase().includes(t.toLowerCase()));
  if (!what && tools.length === 0) return "";
  let line = what ? capitalize(what) : `Worked with ${joinList(tools)}`;
  if (what && tools.length) line += ` using ${joinList(tools)}`;
  if (outcome) line += `, ${outcome}`;
  return line;
}

/** A place a new bullet can go. `path` is the structured entry path. */
export interface RoleOption {
  path: string;
  label: string;
}

/** Roles first, then projects. Empty when the résumé has neither. */
export function roleOptions(structured: StructuredResume | null | undefined): RoleOption[] {
  if (!structured) return [];
  const out: RoleOption[] = [];
  (structured.experience ?? []).forEach((e, i) => {
    const label = [e.role, e.company].map((s) => (s ?? "").trim()).filter(Boolean).join(" · ");
    out.push({ path: `exp.${i}`, label: label || `Role ${i + 1}` });
  });
  (structured.projects ?? []).forEach((p, i) => {
    out.push({ path: `proj.${i}`, label: (p.name ?? "").trim() || `Project ${i + 1}` });
  });
  return out;
}

/** Tools a fix brings in that the Skills section does not list yet. */
export function toolsNotListed(
  tools: readonly string[],
  structured: StructuredResume | null | undefined,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tools) {
    const tool = String(raw ?? "").trim();
    if (!tool) continue;
    const key = tool.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (structured && skillAlreadyListed(structured, tool)) continue;
    out.push(tool);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `tool` appears as its own token in `text`. */
export function toolAppearsIn(tool: string, text: string): boolean {
  const t = tool.trim();
  if (!t || !text) return false;
  return new RegExp(`(?:^|[^A-Za-z0-9+.#])${escapeRe(t)}(?:$|[^A-Za-z0-9+.#])`, "i").test(text);
}

/**
 * Product names we can spot in a rewrite without the user listing them.
 * Short English words (C, R, rest) stay off this list so a sentence does not
 * become a Skills dump. Invented or in-house tools arrive via `unverified`
 * and `vouched` instead, which is the point of those fields.
 */
const CATALOG_TOOLS: readonly string[] = [
  "Python", "Java", "TypeScript", "JavaScript", "Golang", "Go", "Rust", "C++", "C#",
  "Ruby", "Kotlin", "Swift", "Scala", "SQL", "PHP", "MATLAB", "Bash", "Perl", "Dart",
  "Elixir", "Haskell", "Objective-C",
  "Amazon Web Services", "Google Cloud", "GitHub Actions", "GitLab CI", "CloudFormation",
  "AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Ansible", "Jenkins",
  "Helm", "EKS", "ECS", "Lambda", "Pulumi", "ArgoCD", "Datadog", "Grafana", "Prometheus",
  "Nginx", "Linux", "CI/CD",
  "Spark", "Hadoop", "Kafka", "Airflow", "Snowflake", "BigQuery", "Redshift",
  "Databricks", "Tableau", "Power BI", "Looker", "PyTorch", "TensorFlow", "scikit-learn",
  "MLflow", "Hugging Face", "OpenAI", "LangChain",
  "PostgreSQL", "Postgres", "MySQL", "MongoDB", "Redis", "DynamoDB", "Elasticsearch",
  "OpenSearch", "SQLite", "Cassandra", "Neo4j", "Supabase", "Firebase",
  "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "Django", "Flask", "FastAPI",
  "Spring Boot", "Node.js", "Laravel", ".NET", "GraphQL", "gRPC",
  "Tailwind", "Redux", "Jest", "Vitest", "Playwright", "Cypress",
];

/** Catalog tools named in this line. */
export function toolsNamedInText(text: string): string[] {
  if (!text.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of CATALOG_TOOLS) {
    if (!toolAppearsIn(name, text)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * Every tool a rewrite or a user-written line actually names.
 *
 * Invented tools are included: the server flags them as `unverified`, the
 * user types them in the tools field, and both count as long as the applied
 * line uses the word. Catalog names in the line are included too, so a
 * Kubernetes weave that the résumé already evidenced in a bullet still
 * reaches the Skills section.
 */
export function collectAppliedTools(opts: {
  applied: string;
  unverified?: readonly string[];
  vouched?: readonly string[];
  extra?: readonly string[];
}): string[] {
  const applied = opts.applied ?? "";
  const named: string[] = [
    ...(opts.unverified ?? []),
    ...(opts.vouched ?? []),
    ...(opts.extra ?? []),
    ...toolsNamedInText(applied),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of named) {
    const tool = String(raw ?? "").trim();
    if (!tool) continue;
    const key = tool.toLowerCase();
    if (seen.has(key)) continue;
    if (!toolAppearsIn(tool, applied) && !applied.toLowerCase().includes(key)) continue;
    seen.add(key);
    out.push(tool);
  }
  return out;
}

export function hasSkillsSection(structured: StructuredResume | null | undefined): boolean {
  return (structured?.skills ?? []).some((g) => (g.items ?? []).length > 0 || (g.category ?? "").trim());
}

/**
 * Which Skills group a tool belongs in.
 *
 * Matches the résumé's own group names first, so a tool lands where the user
 * already files that kind of thing. With no matching group, the bucket name
 * is returned and the caller creates it. A guess is wrong sometimes; the cost
 * is one visible word the user can drag, and the alternative is every tool
 * piling into the first group.
 */
interface SkillBucket {
  name: string;
  tools: RegExp;
  groups: RegExp;
}

const BUCKETS: readonly SkillBucket[] = [
  {
    name: "Languages",
    tools: /^(python|java|typescript|javascript|js|ts|go|golang|rust|c\+\+|c#|c|ruby|kotlin|swift|scala|sql|php|r|matlab|bash|shell|perl|dart|elixir|haskell|objective-c)$/i,
    groups: /language|programming/i,
  },
  {
    name: "Cloud & DevOps",
    tools: /^(aws|amazon web services|gcp|google cloud|azure|kubernetes|k8s|docker|terraform|ansible|jenkins|ci\/cd|github actions|gitlab ci|helm|eks|ecs|lambda|cloudformation|pulumi|argo ?cd|datadog|grafana|prometheus|nginx|linux)$/i,
    groups: /cloud|devops|infra|platform|ops|deployment/i,
  },
  {
    name: "Data",
    tools: /^(spark|hadoop|kafka|airflow|dbt|snowflake|bigquery|redshift|databricks|pandas|numpy|tableau|power ?bi|looker|pytorch|tensorflow|scikit-learn|sklearn|mlflow|hugging ?face|llm|openai|langchain)$/i,
    groups: /data|analytic|ml|machine|ai\b|science/i,
  },
  {
    name: "Databases",
    tools: /^(postgres(ql)?|mysql|mongodb|mongo|redis|dynamodb|elasticsearch|opensearch|sqlite|cassandra|neo4j|supabase|firebase|oracle|sql server|mssql)$/i,
    groups: /database|\bdb\b|storage|persistence/i,
  },
  {
    name: "Frameworks",
    tools: /^(react|vue|angular|svelte|next(\.js)?|nuxt|django|flask|fastapi|spring( boot)?|node(\.js)?|express|rails|laravel|\.net|asp\.net|graphql|grpc|rest|tailwind|redux|jest|vitest|playwright|cypress)$/i,
    groups: /framework|librar|frontend|front-end|backend|back-end|web|stack/i,
  },
];

const GENERIC_GROUP = /^(skills|technical skills|technologies|tools|tools & technologies|tech)$/i;

export function guessSkillCategory(
  tool: string,
  structured: StructuredResume | null | undefined,
): string {
  const t = tool.trim();
  const groups = (structured?.skills ?? [])
    .map((g) => (g.category ?? "").trim())
    .filter(Boolean);
  const bucket = BUCKETS.find((b) => b.tools.test(t));
  if (bucket) {
    const own = groups.find((g) => bucket.groups.test(g));
    if (own) return own;
  }
  const generic = groups.find((g) => GENERIC_GROUP.test(g) || /tool/i.test(g));
  if (generic) return generic;
  if (bucket) return bucket.name;
  return groups[0] ?? "Tools";
}

/** Tools grouped by the Skills category each should join. */
export function groupToolsByCategory(
  tools: readonly string[],
  structured: StructuredResume | null | undefined,
): Array<{ category: string; tools: string[] }> {
  const by = new Map<string, string[]>();
  for (const tool of tools) {
    const cat = guessSkillCategory(tool, structured);
    const list = by.get(cat) ?? [];
    list.push(tool);
    by.set(cat, list);
  }
  return [...by.entries()].map(([category, list]) => ({ category, tools: list }));
}
