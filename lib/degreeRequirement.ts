/**
 * degreeRequirement — does the résumé already satisfy a degree requirement?
 *
 * A posting asking for "Bachelor's degree or equivalent" is satisfied by someone
 * holding a Master's. Nothing modelled that, so the queue could file a
 * Bachelor's requirement as a blocker for a candidate whose own résumé shows a
 * higher degree, and then offer to "fix" it by rewriting an experience bullet --
 * which cannot evidence a degree at all.
 *
 * Deliberately deterministic and deliberately narrow. A degree is pass/fail to a
 * screener, so a wrong answer here is expensive in both directions: claiming
 * someone has a credential they lack is a fabrication, and telling someone they
 * lack one they hold is the credibility failure this queue exists to end.
 *
 * ⚠️ INVARIANT: bare two-letter abbreviations (BS, BA, MS, MA) are NEVER matched.
 * "MA" is Massachusetts, "MS" is Mississippi, "BA" is Buenos Aires -- a résumé
 * reading "Boston, MA" would otherwise register a Master of Arts. This repo has
 * already shipped this exact bug once in another form: `jp_is_non_us` read
 * "Pune, IN" as Indiana. Spelled-out words and dotted or 3+ character forms
 * (Ph.D, B.Sc, M.Tech, MBA) carry enough signal to be safe; the bare pair does
 * not, and the cost of missing one is a queue row that merely looks unresolved.
 */

/**
 * A credential is held or not held. No rewrite of an experience bullet can
 * create one, so routing these rows to the bullet fixer is a category error --
 * and the observed failure is worse than a dead end: handed "Master's degree",
 * the model rewrote an unrelated LangGraph bullet and justified it as
 * "aligns this bullet with the gap using SOCOM", while the score preview
 * admitted 47.19% -> 47.19%. It confabulates a connection rather than declining.
 */
export function isCredentialRequirement(name: string): boolean {
  if (requiredDegreeLevel(name) !== null) return true;
  return /\b(certification|certified|certificate|licen[sc]e[d]?|accreditation|clearance)\b/i.test(
    name,
  );
}

/** Ordered low to high. The number is the only thing compared. */
export const DEGREE_RANK = {
  associate: 1,
  bachelor: 2,
  master: 3,
  doctorate: 4,
} as const;

export type DegreeLevel = keyof typeof DEGREE_RANK;

/**
 * Patterns per level. Each must be safe to run over a WHOLE résumé, so every
 * entry is either a spelled-out word or an abbreviation distinctive enough that
 * a place name or acronym cannot collide with it.
 */
/*
 * Trailing guard is `(?![A-Za-z])`, NOT `\b`. A dotted abbreviation ends in
 * ".", and the character after it is usually a space -- both non-word, so `\b`
 * asserts a boundary that cannot exist there and "M.S. in Computer Science"
 * silently matched nothing. Caught by the test below, which is the only reason
 * it is not still shipping.
 */
const DEGREE_PATTERNS: ReadonlyArray<readonly [DegreeLevel, RegExp]> = [
  [
    "doctorate",
    /\b(ph\.?\s?d|d\.?phil|doctorate|doctoral|post-?doctoral)(?![A-Za-z])/i,
  ],
  [
    "master",
    /\b(master'?s?|mba|m\.\s?s\.|m\.\s?a\.|m\.?sc|m\.?eng|m\.?tech|m\.?phil)(?![A-Za-z])/i,
  ],
  [
    "bachelor",
    /\b(bachelor'?s?|b\.\s?s\.|b\.\s?a\.|b\.?sc|b\.?eng|b\.?tech|undergraduate\s+degree)(?![A-Za-z])/i,
  ],
  [
    "associate",
    /\b(associate'?s?\s+degree|a\.\s?s\.|a\.\s?a\.)(?![A-Za-z])/i,
  ],
];

/** The highest degree level asserted anywhere in `text`, or null if none. */
export function highestDegreeIn(text: string): DegreeLevel | null {
  if (!text || !text.trim()) return null;
  let best: DegreeLevel | null = null;
  for (const [level, re] of DEGREE_PATTERNS) {
    if (!re.test(text)) continue;
    if (best === null || DEGREE_RANK[level] > DEGREE_RANK[best]) best = level;
  }
  return best;
}

/**
 * The level a requirement asks for, or null when it is not a degree ask at all.
 *
 * "Master's degree or PhD" asks for the LOWEST level named, not the highest: the
 * posting is stating a floor, and either one clears it. Reading it as "PhD"
 * would flag a Master's-holder for a requirement their degree already meets.
 */
export function requiredDegreeLevel(requirement: string): DegreeLevel | null {
  if (!requirement || !requirement.trim()) return null;
  let lowest: DegreeLevel | null = null;
  for (const [level, re] of DEGREE_PATTERNS) {
    if (!re.test(requirement)) continue;
    if (lowest === null || DEGREE_RANK[level] < DEGREE_RANK[lowest]) lowest = level;
  }
  return lowest;
}

/**
 * True when the résumé's own education clears the requirement's floor.
 *
 * Field of study is deliberately NOT checked. "Computer Science or related
 * technical field" is a judgement no regex should be making, and the failure
 * modes are not symmetric: being generous leaves a row unflagged that a human
 * can still see on their own résumé, while being clever tells a physics
 * graduate they do not have a technical degree. Generous is the safe direction.
 */
export function degreeRequirementSatisfied(
  requirement: string,
  resumeText: string,
): boolean {
  const need = requiredDegreeLevel(requirement);
  if (need === null) return false; // not a degree requirement -- not ours to answer
  const held = highestDegreeIn(resumeText);
  if (held === null) return false;
  return DEGREE_RANK[held] >= DEGREE_RANK[need];
}
