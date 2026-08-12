/**
 * Fold the deterministic requirement set into the work queue.
 *
 * The reported bug: the scoreboard read "38% · 9 of 24" above a queue offering
 * three things to fix. Those numbers come from two pipelines that had never
 * been joined:
 *
 *   - the PERCENTAGE counts `requirementConcepts`, the deterministic JD
 *     extraction, matched by the server's phrase matcher;
 *   - the QUEUE came from `ratings.*.missing`, a separate LLM call whose prompt
 *     explicitly tells it to "merge overlapping/paraphrased JD duties into one
 *     canonical responsibility".
 *
 * The rater's job is a readable comparison. We were using its output as a
 * worklist, and a summary makes a bad worklist.
 *
 * ── Why this is a UNION and not a swap ──────────────────────────────────────
 *
 * The obvious fix is "build the queue from the scored concepts instead". That
 * is wrong, because the two lists disagree in BOTH directions and each is right
 * about something the other cannot see:
 *
 *   scorer unmatched + rater missing   Both agree it is a gap. Highest value:
 *                                      fixing it moves the number AND closes a
 *                                      gap a human reviewer would also see.
 *
 *   scorer unmatched + rater covered   The résumé demonstrates it, but not in
 *                                      words the matcher recognises. Invisible
 *                                      before this module, and it is the one
 *                                      class where the honest fix is to borrow
 *                                      the posting's vocabulary — the résumé is
 *                                      not lacking anything.
 *
 *   scorer matched + rater missing     A term appears, but the rater judged the
 *                                      underlying claim unevidenced ("5 years
 *                                      of Python" against one mention). Dropping
 *                                      these would delete real signal, so they
 *                                      stay — flagged as not moving the number,
 *                                      because they will not.
 *
 * Every row therefore carries WHERE IT CAME FROM, and the UI can say plainly
 * which ones move the percentage. That is also the honest answer to the
 * original complaint: the two numbers disagreed because they measure different
 * things, and the fix is to show that rather than to pick a winner.
 *
 * ── Why the join is deliberately timid ──────────────────────────────────────
 *
 * Merging a concept with a rater item means attaching that item's evidence
 * prose to that requirement. A WRONG merge therefore prints the wrong evidence
 * under a requirement, which is the exact credibility failure the
 * self-contradicting-missing fix was built to stop. A missed merge only costs a
 * duplicate-looking row. The failure modes are not symmetric, so `sameRequirement`
 * is conservative on purpose: exact normalized equality, or containment where
 * the shorter string is substantial enough that containment means something.
 *
 * Pure: no fetches, no DOM. The caller owns both inputs.
 */

import type { AddressedGapAction } from "@/lib/types";
import { degreeRequirementSatisfied, isCredentialRequirement, requiredDegreeLevel } from "@/lib/degreeRequirement";
import { isGapAddressed } from "@/lib/tailorGapFix";
import type { QueueItem, QueueKind } from "@/lib/tailorWorkQueue";
import {
  CONTEXTUAL_DETAIL,
  normalizeQueueName,
  queueItemId,
  requirementText,
} from "@/lib/tailorWorkQueue";

/** One requirement concept as `/api/tailor/score-preview` reports it. */
export interface UnmatchedRequirement {
  id: string;
  canonical: string;
  importance?: string;
  /** Extraction's requirement type. Absent on a backend predating the field. */
  type?: string;
}

/**
 * Extraction's requirement type → the band the row belongs in.
 *
 * These rows all shipped as `qualification`, which put every one of them in
 * "Could get you filtered out". That read as a wall of nineteen equally-urgent
 * blockers, and it also erased the thing the section headers exist to say:
 * a missing degree and a missing keyword are not the same problem and do not
 * have the same fix.
 *
 * The mapping is the honest reading of each type:
 *  - a credential, a degree, or years of experience is pass/fail to a screener;
 *  - a named skill or tool is a keyword — real, coverable, not disqualifying;
 *  - a responsibility is duty language, which lands as a keyword too;
 *  - `soft_skill` and `domain_knowledge` are the employer's context words, the
 *    same honesty class as the rater's contextual keywords: stuffing them into
 *    bullets is usually the wrong move, so they get the explainer band.
 *
 * Returns null for a type we do not recognise, or for none at all — a backend
 * predating the field sends no type. The caller then falls back to the rater's
 * own filing, and only past that to `keyword`. Never to `qualification`: that
 * was the old blanket default, so anything unaccounted for shouted, and a
 * default that is wrong quietly costs less than one that is wrong loudly.
 */
const KIND_OF_REQUIREMENT_TYPE: Record<string, QueueKind> = {
  certification: "qualification",
  license: "qualification",
  degree: "qualification",
  experience: "qualification",
  technical_skill: "keyword",
  tool: "keyword",
  responsibility: "keyword",
  soft_skill: "contextual",
  domain_knowledge: "contextual",
};

export function queueKindForRequirementType(type: string | undefined): QueueKind | null {
  return KIND_OF_REQUIREMENT_TYPE[String(type ?? "").trim()] ?? null;
}

/**
 * Which pipeline flagged this row, and therefore what fixing it buys.
 *
 * `scorer` is not a lesser class than `rater` — it is the one the visible
 * percentage is computed from. It is named separately only because the ADVICE
 * differs: borrow the posting's wording versus demonstrate the capability.
 */
export type QueueSource = "both" | "scorer" | "rater";

/**
 * What we are actually claiming about this requirement, in the user's terms.
 *
 * `source` says which pipeline flagged the row, which is bookkeeping. This says
 * what to TELL someone, and the two are not the same sentence: a row the
 * scorer missed but the rater vouched for is not "you lack this", it is "you
 * have this and the scanner cannot see it", and those call for opposite advice.
 *
 * Computed here rather than in the component on purpose. The last time a
 * renderer re-derived a classification from text it disagreed with the
 * producer, and the fix was to make the producer authoritative and have the
 * view trust it verbatim. Same rule.
 */
export type QueueVerdict = "partial" | "not_evidenced" | "not_found" | "keyword" | "covered";

export interface SourcedQueueItem extends QueueItem {
  source: QueueSource;
  /** True when closing this row moves the coverage percentage. */
  movesScore: boolean;
  /**
   * The claim to render. Absent on contextual rows: those already carry an
   * information mark and an explainer, and a verdict word on top would be a
   * third label competing for one glance.
   */
  verdict?: QueueVerdict;
}

/** Detail line for a requirement the résumé evidences in different words. */
export const WORDING_DETAIL =
  "Your résumé shows this, but not in words the scanner matches. Using the posting's phrasing on the bullet below is enough.";

/**
 * Detail line for a requirement neither pipeline found.
 *
 * Says what a keyword scanner knows, because that is what produced this row.
 * It used to read "The scanner did not find this anywhere in your résumé",
 * which is accurate but sat under a chip reading "Not evidenced" — two claims
 * on one row, only the smaller one supported. Naming the mechanism is also the
 * more useful half: a real ATS matches on strings too, so "this phrase is not
 * in your document" is the finding, and it is fixable by wording.
 */
export const SCORER_ONLY_DETAIL =
  "A keyword scanner matching on exact phrases won't find this in your résumé. If you do this work, say it in the posting's words on the bullet below.";

/**
 * WHY a row sits in the band that says it could get you filtered out.
 *
 * The band makes a claim, and until this nothing on the row supported it: the
 * "Why this matters" control rendered a restatement of the chip — "the scanner
 * did not find this" — which is WHAT HAPPENED, not why it matters. A control
 * that promises a reason and repeats the finding teaches people to stop opening
 * it, and it leaves the band's own sentence unsourced.
 *
 * Each reason names the mechanism that screens on that requirement TYPE, which
 * is the only thing we actually know. None of them claims knowledge of a given
 * employer's process.
 *
 * ⚠️ A type with no entry here does NOT belong in this band. If we cannot say
 * why something would filter someone out, we must not put it under a heading
 * that says it will — which is how duties like "Participate in design reviews"
 * came to sit under "Could get you filtered out" in the first place.
 */
export const BLOCKER_REASON: Readonly<Record<string, string>> = {
  degree:
    "A degree is usually a yes/no question on the application form, answered before anyone reads your résumé.",
  certification:
    "Named certifications are usually a form question, and get verified if you are hired.",
  license:
    "A licence is a legal requirement for the role. It is checked, not weighed against the rest of your application.",
  clearance:
    "A clearance is a hard eligibility requirement. It is checked, not weighed against the rest of your application.",
  experience:
    "Minimum-years requirements are often a form question that screens applications automatically.",
};

/** Years threshold ("5+ years", "1 year of..."). What separates a screening
 *  criterion from a duty that happens to be typed `experience`. */
const YEARS_RE = /\b\d{1,2}\s*\+?\s*(?:years?|yrs?)\b/i;

/**
 * The reason this requirement can screen someone out, or null when we cannot
 * name one — in which case the row must not sit under a heading that says it
 * will.
 */
export function blockerReasonFor(name: string, type?: string): string | null {
  if (requiredDegreeLevel(name) !== null) return BLOCKER_REASON.degree;
  if (/\bcertif/i.test(name)) return BLOCKER_REASON.certification;
  if (/\blicen[sc]e/i.test(name)) return BLOCKER_REASON.license;
  if (/\bclearance\b/i.test(name)) return BLOCKER_REASON.clearance;
  if (YEARS_RE.test(name)) return BLOCKER_REASON.experience;
  const t = String(type ?? "").trim();
  return t === "degree" || t === "certification" || t === "license"
    ? BLOCKER_REASON[t]
    : null;
}

/**
 * Detail for a credential the résumé does not evidence.
 *
 * "The scanner did not find this" is true but reads as a tooling shortfall, and
 * the row's right-hand slot then said "No action" — a grey dead end. What is
 * actually happening is that the product is refusing to claim a qualification
 * the candidate does not hold, which is the single thing it must never do. Said
 * plainly, the constraint becomes the reason to trust the rest of the page.
 */
export const CREDENTIAL_REFUSAL_DETAIL =
  "We won't claim a credential you don't have. A degree is among the first things an employer verifies, so this one is yours to earn, not ours to write.";

/** Appended to rater-only rows so nobody expects the number to move. */
export const NO_SCORE_MOVE_NOTE =
  "The scanner already counts this as matched, so covering it will not change the percentage.";

const MIN_CONTAINMENT_LEN = 6;

/**
 * Do two requirement strings name the same thing?
 *
 * Conservative by design (see the module header): a false merge misattributes
 * evidence, a missed merge costs a duplicate row. `MIN_CONTAINMENT_LEN` keeps
 * short tokens from swallowing longer requirements — without it "R" or "API"
 * would match nearly everything by containment.
 */
export function sameRequirement(a: string, b: string): boolean {
  const x = normalizeQueueName(a);
  const y = normalizeQueueName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length < MIN_CONTAINMENT_LEN) return false;
  return long.includes(short);
}

/** Pull every requirement string out of one side of a rater ratings payload. */
function textsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((it) => requirementText(it)).filter((s) => s.length > 0);
}

export interface RaterView {
  /** Everything the rater called missing, in the order it emitted them. */
  missing: readonly string[];
  /** Everything the rater called covered — used only as counter-evidence. */
  covered: readonly string[];
  /**
   * Which list each missing name came off, by normalized name.
   *
   * Needed because the merge keeps the SCORER's row and drops the rater's when
   * both name the same requirement. Without this, a requirement the rater filed
   * as a qualification but extraction sent untyped would silently lose its band
   * on the way through — the merge would be discarding information rather than
   * combining it.
   *
   * Optional: it is a hint used only when extraction did not say, and the
   * fallback chain already handles it being absent.
   */
  kindOf?: ReadonlyMap<string, QueueKind>;
}

/** Flatten the rater's qualification + responsibility lists into one view. */
export function raterView(ratings: unknown): RaterView {
  const r = (ratings ?? {}) as Record<string, unknown>;
  const side = (key: string, field: string): string[] => {
    const block = r[key] as Record<string, unknown> | undefined;
    return textsOf(block?.[field]);
  };
  const quals = side("qualifications", "missing");
  const resps = side("responsibilities", "missing");
  const kindOf = new Map<string, QueueKind>();
  for (const name of quals) kindOf.set(normalizeQueueName(name), "qualification");
  for (const name of resps) {
    const key = normalizeQueueName(name);
    if (!kindOf.has(key)) kindOf.set(key, "responsibility");
  }
  return {
    missing: [...quals, ...resps],
    covered: [...side("qualifications", "covered"), ...side("responsibilities", "covered")],
    kindOf,
  };
}

/**
 * The claim a row makes, from what we know about it.
 *
 * Order matters. `raterCovered` wins over kind because it is the strongest
 * thing we know: the rater read the résumé and vouched for this requirement,
 * so whatever type it is, the honest line is that the evidence is there and
 * the wording is not. Getting this backwards would tell someone they lack
 * something their own résumé demonstrates.
 *
 * ⚠️ `not_evidenced` IS A CLAIM ABOUT A PERSON, so it needs evidence we
 * actually have. Read what produces the input to this function before widening
 * it: the scorer's "unmatched" comes from `match_requirement`, which tries the
 * canonical phrase, up to four aliases the extraction model wrote WITHOUT EVER
 * SEEING THE RÉSUMÉ, a generated abbreviation, a six-entry synonym table, and a
 * stemmed all-token check. That is a keyword scanner. It cannot tell that
 * "mentored four engineers and owned the platform roadmap" is technical
 * leadership, and it was never able to — so a miss from it means THE WORDS ARE
 * NOT IN THE DOCUMENT, which is a useful thing to say and a different sentence
 * from "you have not done this".
 *
 * So exactly one thing reaches it: a DEGREE requirement. `requiredDegreeLevel`
 * recognised a level in the requirement, and `degreeRequirementSatisfied` then
 * read the résumé with degree hierarchy and found nothing at or above it. That
 * is a real check against the document, so "not evidenced" is a claim we have
 * earned — and it is also the one place the claim has to be made, because
 * offering to write in a degree someone lacks is the one thing this product
 * must never do.
 *
 * ⚠️ NOT certifications, licences or clearances, even though
 * `isCredentialRequirement` groups them with degrees for ROUTING. That grouping
 * is about where the row goes (never to the bullet fixer); it is not evidence.
 * `degreeRequirementSatisfied` returns false for them WITHOUT LOOKING — its own
 * comment says "not a degree requirement, not ours to answer" — so all we know
 * about an unmatched "AWS certification" is that the phrase is missing. They
 * take `not_found` with everything else, and their routing is unaffected:
 * `itemAction` sends any credential that is not `partial`/`covered` to the
 * refusal, so we still decline to write one in.
 *
 * The path that used to reach `not_evidenced` for an ordinary capability was an
 * UNTYPED row falling back to the rater's list membership: extraction sent no
 * `type`, the rater happened to file it under qualifications, and a phrase like
 * "technical leadership" was rendered as a failed hard requirement. That is an
 * LLM's filing decision deciding whether we call someone unqualified.
 */
function verdictFor(
  kind: QueueKind,
  raterCovered: boolean,
  /**
   * True only when something ACTUALLY READ THE RÉSUMÉ and concluded the
   * requirement is not met. Exactly two things qualify:
   *
   *  - a degree requirement whose hierarchy check ran against the text and
   *    found nothing at or above the required level;
   *  - a rater row, where the model read the résumé and judged the claim
   *    behind an already-matched term unevidenced ("5 years of Python" against
   *    one mention).
   *
   * A keyword scanner missing a phrase is NOT one of them, and passing `true`
   * for the scorer's ordinary rows is how this screen came to tell qualified
   * people they had not evidenced their own experience.
   */
  absenceEstablished: boolean,
): QueueVerdict | undefined {
  if (kind === "contextual") return undefined;
  if (raterCovered) return "partial";
  if (kind === "keyword") return "keyword";
  return absenceEstablished ? "not_evidenced" : "not_found";
}

/**
 * Build the queue rows the deterministic scorer is complaining about.
 *
 * Returns ONLY the scorer-derived rows. The caller merges them with
 * `deriveWorkQueue`'s rater rows, which is where `source: "rater"` comes from —
 * keeping this function honest about its one input and testable without a
 * ratings payload.
 *
 * `kind` comes from the requirement's own extraction type, so a degree bands as
 * a blocker and a tool bands as a keyword. It used to be fixed to
 * "qualification", which filed every row under one header and told the user
 * that nineteen unrelated things were all the same kind of urgent.
 */
export function deriveScorerQueue(
  unmatched: readonly UnmatchedRequirement[],
  rater: RaterView,
  addressed: ReadonlySet<string> = new Set(),
  actions?: readonly AddressedGapAction[],
  /**
   * The résumé being scored, for the deterministic credential check below.
   *
   * Optional and defaulted so every existing caller and test is byte-unchanged:
   * omitting it reproduces the pre-wiring behaviour exactly.
   */
  resumeText = "",
): SourcedQueueItem[] {
  const out: SourcedQueueItem[] = [];
  const seen = new Set<string>();
  for (const req of unmatched) {
    const name = String(req?.canonical ?? "").trim();
    if (!name) continue;

    /**
     * A degree the résumé actually holds is not a gap, whatever the rater said.
     *
     * The scorer matches requirements by phrase and knows nothing about degree
     * hierarchy, so "Bachelor's degree" comes back unmatched for someone with
     * two Master's. The rater is a second opinion and misses it too often: on
     * the run this was found from, it filed "Bachelor's degree" as covered and
     * "Master's degree" as missing, from ONE résumé listing a Bachelor of
     * Engineering and two Master of Science degrees. So the row said a man with
     * two Master's had not evidenced a Master's.
     *
     * This check outranks the rater because it is evidence rather than an
     * opinion: the qualifying degree is literally in the text. It can only ever
     * REMOVE a row — it never invents coverage — and `degreeRequirementSatisfied`
     * is conservative in the direction that matters (a blank résumé satisfies
     * nothing; bare BS/BA/MS/MA never match, so "Boston, MA" cannot register a
     * Master of Arts; certifications and licences return null and fall through
     * to the behaviour below unchanged).
     */
    if (isCredentialRequirement(name) && degreeRequirementSatisfied(name, resumeText)) continue;

    // The posting's title is not a requirement row. Extraction emits it as one
    // (`req:job-title`, type=experience) so the scorer can grade title match —
    // but rendered here it became a red "Fix this" row offering to rewrite the
    // user's own job title, directly under the title note that already reports
    // the same comparison. One fact, one surface.
    if (String(req?.id ?? "").trim() === "req:job-title") continue;

    // Extraction's own type first: it is a claim about what the requirement
    // IS. The rater's list membership is only where it filed the comparison,
    // so it fills the gap rather than overriding. `keyword` last, because a
    // row we know nothing about should not be shouting.
    let kind =
      queueKindForRequirementType(req?.type)
      ?? rater.kindOf?.get(normalizeQueueName(name))
      ?? "keyword";

    // A row may sit under "Could get you filtered out" ONLY if we can name the
    // mechanism that filters (see BLOCKER_REASON). The `experience` type
    // catches both "5+ years of X" — a real screening question — and duties
    // like "Experience developing accessible technologies", and filing the
    // duties as blockers is how a user opened this screen to ten red rows of
    // which two were actual knockouts. A credential keeps its band regardless
    // (its refusal machinery lives there); everything else needs an explicit
    // years threshold, and needs to be stated as REQUIRED — the extraction's
    // own high/medium/low ranking, which this screen collected and then never
    // read. "Preferred" and a hard filter are different claims.
    // Credential by NAME or by extraction's own TYPE — either is a nameable
    // filter (BLOCKER_REASON has an entry for both routes). Name alone is not
    // enough: "MS in Computer Science" deliberately fails the name check (bare
    // MS never matches, or "Boston, MA" is a Master of Arts), while extraction
    // typing it `degree` is a claim about what it IS.
    const credential =
      isCredentialRequirement(name) ||
      ["degree", "certification", "license"].includes(String(req?.type ?? "").trim());
    if (kind === "qualification" && !credential) {
      const required = String(req?.importance ?? "required") === "required";
      if (!YEARS_RE.test(name) || !required) kind = "keyword";
    }
    const id = queueItemId(kind, name);
    if (seen.has(id)) continue;
    seen.add(id);

    const raterMissing = rater.missing.some((m) => sameRequirement(m, name));
    // Only consult `covered` when the rater did not also call it missing: a
    // rater that says both is not evidence of anything, and "missing" is the
    // claim that should survive the tie.
    const raterCovered = !raterMissing && rater.covered.some((c) => sameRequirement(c, name));

    out.push({
      id,
      name,
      kind,
      // `addressedGaps` holds the RAW labels the apply path recorded, and every
      // other consumer compares them with the tolerant `gapKeysMatch`. This
      // used to do an exact `.has(normalizeQueueName(name))`, which is a
      // different key space, so it never matched: a user applied a fix, the
      // keyword count moved, and the row went on saying "Not evidenced" with a
      // Fix button. Since the union, that is most of the queue.
      status: isGapAddressed(name, addressed, actions) ? "applied" : "queued",
      // A contextual row keeps the explainer even though the scanner did miss
      // it. "The scanner did not find this" reads as a to-do, and for an
      // employer-domain word the honest answer is that writing it in is
      // usually the wrong move — the same class the rater's contextual
      // keywords are already handled as.
      // A blocker row's detail LEADS with why it can filter you out. "Why this
      // matters" used to open on a restatement of the chip — what happened,
      // never why it matters — which left the band's own claim unsourced.
      detail: kind === "contextual"
        ? CONTEXTUAL_DETAIL
        : raterCovered
          ? WORDING_DETAIL
          : credential
            ? [blockerReasonFor(name, req?.type), CREDENTIAL_REFUSAL_DETAIL].filter(Boolean).join(" ")
            : kind === "qualification"
              ? [blockerReasonFor(name, req?.type), SCORER_ONLY_DETAIL].filter(Boolean).join(" ")
              : SCORER_ONLY_DETAIL,
      source: raterMissing ? "both" : "scorer",
      // Both classes are unmatched by the scorer, so both move the number.
      movesScore: true,
      // Reaching here with a degree level means the guard at the top of the
      // loop already ran `degreeRequirementSatisfied` and it came back false —
      // i.e. we read the résumé and found nothing at or above that level. That
      // is the evidence behind the only claim this row is allowed to make about
      // the candidate. See verdictFor.
      verdict: verdictFor(kind, raterCovered, requiredDegreeLevel(name) !== null),
    });
  }
  return out;
}

/**
 * The requirements the résumé already satisfies, as reassurance rows.
 *
 * These were never in the queue. The mockup's argument for adding them is that
 * a covered requirement is currently invisible, so a user reading "7 to review"
 * has no way to see the ten they already meet — the surface only ever tells
 * them what is wrong. Putting them in their own band, last, at the bottom,
 * costs one line each and changes what the page is: a report rather than a
 * complaint list.
 *
 * They carry the rater's own evidence as `detail`, so "You have this" is
 * followed by the sentence that justifies it rather than by an assertion the
 * user has to take on faith.
 *
 * ⚠️ They are `status: "covered"`, which `queueCounts` excludes from `open`.
 * A requirement you meet must never inflate the number you are judged on.
 */
export function deriveCoveredQueue(
  ratings: unknown,
  /**
   * Rows already in the work queue.
   *
   * ⚠️ Load-bearing. The scorer-unmatched + rater-covered class is exactly the
   * "Partial match" row: the résumé shows it, the matcher cannot see it. That
   * requirement is ALSO on the rater's covered list, so without this filter it
   * renders twice — once as work and once as reassurance, with two different
   * verdicts on the same line item. Caught by a panel test finding two rows
   * for one requirement, which is the duplicate the merge exists to prevent.
   */
  alreadyQueued: readonly QueueItem[] = [],
): SourcedQueueItem[] {
  const r = (ratings ?? {}) as Record<string, unknown>;
  const out: SourcedQueueItem[] = [];
  const seen = new Set<string>();

  const take = (key: string, kind: QueueKind) => {
    const block = r[key] as Record<string, unknown> | undefined;
    const list = block?.covered;
    if (!Array.isArray(list)) return;
    for (const raw of list) {
      const name = requirementText(raw);
      if (!name) continue;
      const id = queueItemId(kind, name);
      if (seen.has(id)) continue;
      // A requirement the work queue is already showing stays there. Work
      // wins over reassurance: the user can act on the one and not the other.
      if (alreadyQueued.some((q) => sameRequirement(q.name, name))) continue;
      seen.add(id);
      const o = (raw ?? {}) as { context?: unknown; analysis?: unknown };
      const evidence =
        (typeof o.context === "string" && o.context.trim())
        || (typeof o.analysis === "string" && o.analysis.trim())
        || "";
      out.push({
        id,
        name,
        kind,
        status: "covered",
        detail: evidence,
        source: "rater",
        // Already matched, so closing it is not available and would not move
        // anything. Saying otherwise would be the same false promise the
        // `movesScore` flag exists to prevent.
        movesScore: false,
        verdict: "covered",
      });
    }
  };

  take("qualifications", "qualification");
  take("responsibilities", "responsibility");
  return out;
}

/**
 * Merge scorer rows with the rater rows already derived elsewhere.
 *
 * Scorer rows come first: they are the ones that move the visible number, and
 * a queue ordered by anything else would bury them. A rater row naming a
 * requirement a scorer row already covers is dropped, so the same requirement
 * never appears twice under two different wordings.
 *
 * Surviving rater rows are marked `movesScore: false` — not to demote them, but
 * because the alternative is a user applying six fixes and watching a
 * percentage sit still, which is the bug that started all of this.
 */
export function mergeQueues(
  scorerItems: readonly SourcedQueueItem[],
  raterItems: readonly QueueItem[],
): SourcedQueueItem[] {
  const covered = scorerItems.map((it) => it.name);
  const extra = raterItems
    .filter((it) => !covered.some((name) => sameRequirement(name, it.name)))
    .map<SourcedQueueItem>((it) => ({
      ...it,
      source: "rater",
      movesScore: false,
      // The scanner already matched the term; the rater READ THE RÉSUMÉ and
      // judged the claim behind it unevidenced. That is the one gap class where
      // a model, not a regex, is the source — so it is also the one non-degree
      // row entitled to say "Not evidenced".
      verdict: verdictFor(it.kind, false, true),
      detail: it.detail
        ? `${it.detail} ${NO_SCORE_MOVE_NOTE}`
        : NO_SCORE_MOVE_NOTE,
    }));
  return [...scorerItems, ...extra];
}

/**
 * How many open rows would move the percentage.
 *
 * The queue header can then say "12 of 15 move your match" instead of a bare
 * count that invites the same "why is it 43% with 3 fixes" question again.
 */
export function scoreMovingCount(items: readonly SourcedQueueItem[]): number {
  return items.filter(
    (it) => it.movesScore && (it.status === "queued" || it.status === "needs_review"),
  ).length;
}
