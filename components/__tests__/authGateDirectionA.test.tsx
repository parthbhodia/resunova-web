import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import SignInRequiredPage from "@/components/auth/SignInRequiredPage";
import { gateContentFor } from "@/components/auth/gateContent";

vi.mock("@/lib/anonScan", () => ({ signInWithGoogle: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/emailAuth", () => ({
  signInWithEmail: vi.fn().mockResolvedValue(null),
  signUpWithEmail: vi.fn().mockResolvedValue({ error: null, needsConfirmation: false }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

beforeEach(cleanup);

/**
 * ⚠️ COMMENTS ARE STRIPPED BEFORE SCANNING. The first draft of the two source
 * checks below matched the component's OWN DOCSTRING, which quotes the defect
 * it fixes (`color: "#fff"`) and names the flow that does not exist ("sign-in
 * link"). A scan that reads prose about a bug cannot tell it from the bug.
 */
function codeOnly(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}
const SRC = codeOnly("components/auth/SignInRequiredPage.tsx");
/**
 * The form moved out of the page into `AuthMethods`, which the modal renders
 * too — so the checks below follow the thing they guard rather than the file
 * that used to hold it. Both files are still scanned for a hardcoded white, so
 * re-adding one to either turns this red.
 */
const FORM_SRC = codeOnly("components/auth/AuthMethods.tsx");

describe("the gate asks once, on one surface", () => {
  /**
   * ⚠️ THE DEFECT THIS PAGE EXISTS TO FIX. The old gate's primary button
   * called openSignIn(), so pressing the thing that said "Sign in" produced a
   * modal that asked again — two surfaces for one decision. The page must
   * never reach for the dialog.
   */
  it("never opens the sign-in dialog", () => {
    expect(SRC).not.toContain("useSignInDialog");
    expect(SRC).not.toContain("openSignIn");
  });

  it("puts the email form on the page rather than behind a surface", () => {
    render(<SignInRequiredPage pathname="/interview-prep" />);
    expect(screen.queryByLabelText("Password")).toBeNull();
    fireEvent.click(screen.getByText(/continue with email instead/i));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(document.querySelector("[role=dialog]")).toBeNull();
  });

  /**
   * ⚠️ DESIGN.md invariant 7. The shipped gate paired `background:
   * var(--accent)` with `color: "#fff"`, which measures 2.53:1 in dark mode
   * because the hue tokens are tuned to be READ on the background and are
   * therefore light there. Browser-measured after the fix: 5.19 light,
   * 7.49 dark.
   */
  it("never hardcodes a white foreground on a filled control", () => {
    expect(SRC).not.toMatch(/color:\s*["']#f{3,6}["']/i);
    expect(FORM_SRC).not.toMatch(/color:\s*["']#f{3,6}["']/i);
    expect(FORM_SRC).toContain("var(--on-fill)");
  });
});

describe("the gate does not promise what the product lacks", () => {
  /**
   * The approved comp's email action read "Email me a sign-in link", and when
   * this test was written there was no `signInWithOtp` anywhere in the repo —
   * so that button would have advertised a flow that does not exist, the same
   * defect class as the template gallery's phantom "CV layout".
   *
   * ⚠️ THE PREMISE CHANGED AND THE RULE DID NOT, WHICH IS WHY THIS IS NARROWED
   * RATHER THAN DELETED. #335 added a magic link, but ONLY as the recovery for
   * a repeated signup on an address that already has an account: the form tells
   * that person an email is on its way. That is a notice after a failed
   * action, not a door. The rule worth keeping is that no magic link is OFFERED
   * AS A WAY IN — a third entry path beside Google and email is another
   * decision at the point where the entire design is to present one.
   *
   * So the gate page, which has no signup path at all, still bans the phrase
   * outright; the shared form bans the ACTION — a button, a submit label, or a
   * call — while allowing the notice. Deleting the test would have been the
   * easy read of this failure and would have left the door unguarded.
   */
  it("the gate page offers no magic link at all", () => {
    expect(SRC).not.toMatch(/sign-in link|magic link|signInWithOtp/i);
  });

  it("⚠️ the shared form never offers a magic link as a way in", () => {
    // No call: the form must not initiate one itself.
    expect(FORM_SRC).not.toMatch(/signInWithOtp|sendMagicLink/);
    // No control: the phrase may appear only inside a notice string, never as
    // a button label or a submit label.
    const controls = FORM_SRC.match(/<button[^>]*>[\s\S]{0,160}?<\/button>/g) ?? [];
    expect(controls.length).toBeGreaterThan(2); // control: we did find the buttons
    for (const control of controls) {
      expect(control).not.toMatch(/sign-in link|magic link|email me a link/i);
    }
  });

  /**
   * ⚠️ A signed-out visitor has no résumé on file. The comp's preview said
   * "Your résumé has the Pub/Sub → Dataflow work. Lead with that one." — a
   * personalised insight on the one surface where we provably know nothing.
   */
  it("never claims to already know the visitor's résumé", () => {
    const content = codeOnly("components/auth/gateContent.tsx");
    expect(content).not.toMatch(/Your résumé has|your resume has/i);
    expect(content).not.toMatch(/Lead with that one/i);
  });

  it("makes only checkable assurances", () => {
    render(<SignInRequiredPage pathname="/interview-prep" />);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("No credit card")).toBeInTheDocument();
    // "About 10 seconds" from the comp is not checkable; this is.
    expect(screen.getByText("One click with Google")).toBeInTheDocument();
    expect(screen.queryByText(/10 seconds/i)).toBeNull();
  });
});

describe("the gate leads with the gain and names the destination", () => {
  it("does not open with our requirement", () => {
    render(<SignInRequiredPage pathname="/interview-prep" />);
    const h1 = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    expect(h1).not.toMatch(/sign in to continue/i);
    expect(h1).toMatch(/saved and waiting/i);
  });

  it("names the destination and promises the return, which the code keeps", () => {
    render(<SignInRequiredPage pathname="/interview-prep" />);
    expect(screen.getByText(/You'll land back on Interview Prep/)).toBeInTheDocument();
    expect(screen.getByText("Back to home")).toBeInTheDocument();
  });

  it("falls back to generic copy on an unknown gated route", () => {
    expect(gateContentFor("/something-new").eyebrow).toBe("Resunova");
    expect(gateContentFor(null).eyebrow).toBe("Resunova");
  });
});

describe("the preview panel", () => {
  /**
   * It illustrates the destination. A screen reader walking four sample
   * questions before reaching the sign-in form would read them as the page's
   * actual content.
   */
  it("is hidden from assistive tech", () => {
    const { container } = render(<SignInRequiredPage pathname="/interview-prep" />);
    // ⚠️ Scoped to the PANEL. The first draft took the first aria-hidden node
    // in the tree, which is the Google glyph SVG — also aria-hidden, earlier
    // in document order, and empty. It reported '' and proved nothing.
    const panel = container.querySelector('[data-gate-preview]');
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(panel?.textContent).toContain("What's behind this");
  });

  /**
   * ⚠️ A settings page has nothing worth showing half-open. Inventing a panel
   * to keep the layout symmetrical would be decoration pretending to be
   * information, so /account is single-column by design.
   */
  it("is absent on /account rather than invented to fill the grid", () => {
    expect(gateContentFor("/account").previewCards).toBeUndefined();
    render(<SignInRequiredPage pathname="/account" />);
    expect(screen.queryByText("What's behind this")).toBeNull();
    expect(screen.getByText(/Continue with Google/)).toBeInTheDocument();
  });

  it("is present on the routes that have something to show", () => {
    expect(gateContentFor("/interview-prep").previewCards?.length).toBeGreaterThan(0);
    expect(gateContentFor("/my-resumes").previewCards?.length).toBeGreaterThan(0);
  });
});
