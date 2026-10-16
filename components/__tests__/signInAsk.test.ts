import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SIGN_IN_ASK_KEYS,
  signInAskFor,
  type SignInAskKey,
} from "@/components/auth/signInAsk";
import { gateContentFor } from "@/components/auth/gateContent";
import { FREE_SCAN_DAILY_LIMIT } from "@/lib/planLimits";

describe("the sign-in ask producer", () => {
  it("resolves every key to an eyebrow and a headline", () => {
    expect(SIGN_IN_ASK_KEYS.length).toBeGreaterThan(0);
    for (const key of SIGN_IN_ASK_KEYS) {
      const ask = signInAskFor(key);
      expect(ask.eyebrow, key).toBeTruthy();
      expect(ask.headline, key).toBeTruthy();
    }
  });

  /**
   * ⚠️ THE DEFECT THE PRODUCER EXISTS TO FIX. Every shipped title was phrased
   * as our requirement — "Sign in to run ATS & job match", "Sign in to view
   * hiring contacts", "Sign in to personalize jobs" — on the one surface whose
   * whole job is to be worth completing. Asserted over EVERY key, so a new
   * gated action cannot reintroduce the shape one row at a time.
   */
  it("never leads with our requirement", () => {
    for (const key of SIGN_IN_ASK_KEYS) {
      const { headline } = signInAskFor(key);
      expect(headline, key).not.toMatch(/^sign in/i);
      expect(headline, key).not.toMatch(/^create (an )?(a )?free account/i);
      expect(headline, key).not.toMatch(/needs a free account/i);
    }
  });

  it("never greets instead of answering", () => {
    for (const key of [...SIGN_IN_ASK_KEYS, undefined]) {
      expect(signInAskFor(key).headline, String(key)).not.toMatch(/^welcome\b/i);
    }
  });

  /**
   * ⚠️ A visitor reaches the same destination through the full-page gate (typed
   * the URL while signed out) or through the modal (clicked something). The two
   * surfaces disagreeing about what that destination offers is a real defect —
   * it shipped once, when the gate started leading with Google and the modal
   * still buried it. Pinned in BOTH directions: the modal's copy for a gated
   * route must be the gate's own, so the drift is unexpressible.
   */
  it.each([
    ["interview_prep" as SignInAskKey, "/interview-prep"],
    ["library" as SignInAskKey, "/my-resumes"],
  ])("borrows the gate's own wording for %s", (key, pathname) => {
    const ask = signInAskFor(key);
    const gate = gateContentFor(pathname);
    expect(ask.eyebrow).toBe(gate.eyebrow);
    expect(ask.headline).toBe(gate.headline);
    expect(ask.why).toBe(gate.lede);
  });

  it("falls back to the gate's generic content, not its own string", () => {
    const generic = gateContentFor(null);
    expect(signInAskFor().headline).toBe(generic.headline);
    expect(signInAskFor(null).eyebrow).toBe(generic.eyebrow);
  });

  /**
   * ⚠️ A literal "3 scans a day" in copy becomes a lie in front of a paying
   * user the day POLICY_V1 moves — the invariant /pricing already carries.
   * Asserting it is interpolated, not that it currently reads "3".
   */
  it("interpolates the scan cap rather than typing the digit", () => {
    expect(signInAskFor("resume_scan").headline).toContain(String(FREE_SCAN_DAILY_LIMIT));
    expect(signInAskFor("scan_allowance_spent").headline).toContain(String(FREE_SCAN_DAILY_LIMIT));
  });

  /**
   * A guest who has already spent their free per-IP scan must not be told
   * about an allowance they just used. Two keys, not one sentence behind a
   * ternary at the call site.
   */
  it("says something different to a guest whose allowance is spent", () => {
    expect(signInAskFor("scan_allowance_spent").headline).not.toBe(
      signInAskFor("resume_scan").headline,
    );
  });
});

/**
 * ⚠️ WHY A CALL-SITE PIN AND NOT JUST THE TYPE. #325 shipped the extension
 * page calling `openSignIn({ reason: "Sign in to connect the Resunova
 * extension." })` — a tenth hand-written variant, leading with our
 * requirement, written after the other nine had been consolidated into this
 * module. It was caught here by the COMPILER, which is luck rather than
 * design: the compiler sees a removed prop, and would see nothing at all if
 * the next call site simply hand-wrote its copy into a heading beside a
 * bare `openSignIn()`. The rules above cover every key in the producer; this
 * covers the places that reach for it.
 *
 * Comments are stripped first — SignInDialog's own docstring quotes the old
 * `{ title, reason }` API to explain its removal, and this repo has shipped a
 * scan matching its own explanation three times.
 */
describe("the ask reaches the modal from the call sites", () => {
  const code = (p: string) =>
    readFileSync(resolve(__dirname, "..", "..", p), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  it("⚠️ no call site hands the modal its own copy", () => {
    for (const file of [
      "components/ExtensionConnect.tsx",
      "components/refer/ReferrerRequestForm.tsx",
      "components/SignInDialog.tsx",
    ]) {
      const src = code(file);
      // Control: the stripper must not have emptied the file being scanned.
      expect(src.length, file).toBeGreaterThan(200);
      expect(src, `${file} must not pass a hand-written title`).not.toMatch(/openSignIn\(\{[^}]*title:/);
      expect(src, `${file} must not pass a hand-written reason`).not.toMatch(/openSignIn\(\{[^}]*reason:/);
    }
  });

  it("⚠️ the extension page asks by key, so its copy lives in the producer", () => {
    const src = code("components/ExtensionConnect.tsx");
    expect(src).toMatch(/openSignIn\(\{\s*ask:\s*"extension_connect"\s*\}\)/);
    expect(SIGN_IN_ASK_KEYS).toContain("extension_connect" as SignInAskKey);
  });
});
