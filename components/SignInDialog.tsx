"use client";

/**
 * SignInDialog — the modal a gated click opens.
 *
 * Before this existed, "Sign in" was reinvented in ~14 places. Every gated
 * action now calls `useSignInDialog().openSignIn({ ask })` and gets the same
 * surface. Mount `<SignInDialogProvider>` once in the root layout.
 *
 * WHAT THE REBUILD FIXED — six faults, in order of what they cost
 * ---------------------------------------------------------------
 * 1. ⚠️ THE CHEAPEST PATH WAS LAST. Google sat below an `OR`, under two email
 *    fields and a mode toggle. Worse, the gate page had just been rebuilt to
 *    lead with Google — so the two auth surfaces disagreed about the primary
 *    action, decided by which one you happened to reach. Both now render one
 *    `AuthMethods`, so the disagreement is unexpressible rather than merely
 *    fixed.
 * 2. ⚠️ "Free resume scoring in 60 seconds" is a number we cannot stand
 *    behind. A real scan runs 30–65s, so 60 was near the worst case sold as
 *    the promise. The three assurances that replace it are each checkable.
 * 3. A 190px marketing block sat between the headline and the first control.
 *    This dialog only opens because someone clicked something: they have
 *    already decided, and the box spent their attention re-selling.
 * 4. ⚠️ THE MOST PERSUASIVE SENTENCE AVAILABLE WAS THROWN AWAY. Call sites
 *    pass a specific reason; the design showed a generic "Welcome to
 *    Resunova" above it. The headline is now the gain for what you clicked,
 *    from `signInAskFor` — which is also where the copy lives, instead of
 *    nine hand-written variants across nine files.
 * 5. No segmented control. Sign-in vs create are the same two fields; the
 *    toggle only picked which API call fires, and asking first is a decision
 *    before the decision. It is a link under the button now.
 * 6. ~1,500px tall under `100dvh - 2rem`, so on a 800px laptop the primary
 *    button started below the fold. Collapsed this is ~430px.
 *
 * A caller that passes no `ask` at all — the six bare `openSignIn()` calls in
 * the shell and the landing page, where there is no single destination to name
 * — gets the gate page's own generic line, not a greeting.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import AuthMethods from "@/components/auth/AuthMethods";
import { signInAskFor, type SignInAskKey } from "@/components/auth/signInAsk";
import { signInWithGoogle } from "@/lib/anonScan";

export type SignInDialogOptions = {
  /**
   * What the visitor was doing. Resolves to eyebrow + gain headline through
   * `signInAskFor`.
   *
   * ⚠️ THERE IS DELIBERATELY NO `title` / `reason` ESCAPE HATCH. Those were the
   * old API and all thirteen call sites that passed them are migrated, so
   * keeping them would be a prop with no live value — a lie about having a
   * choice, the same thing the quota disc's `collapsed` prop was. More to the
   * point, they are how the copy scattered: nine hand-written variants of one
   * sentence across nine files, each phrased as our requirement. A new gated
   * action adds a key to the producer, where its wording sits next to its
   * siblings and is covered by the producer's tests.
   */
  ask?: SignInAskKey;
};

type SignInDialogContextValue = {
  openSignIn: (opts?: SignInDialogOptions) => void;
};

const SignInDialogContext = createContext<SignInDialogContextValue | null>(null);

/**
 * Access the shared modal. Falls back to a direct OAuth redirect when a
 * component renders outside the provider, so a missing provider never leaves a
 * "Sign in" button dead.
 */
export function useSignInDialog(): SignInDialogContextValue {
  const ctx = useContext(SignInDialogContext);
  return (
    ctx ?? {
      openSignIn: () => {
        void signInWithGoogle();
      },
    }
  );
}

export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<SignInDialogOptions>({});

  const openSignIn = useCallback((next?: SignInDialogOptions) => {
    setOpts(next ?? {});
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  const ask = signInAskFor(opts.ask);
  const { eyebrow, headline, why } = ask;

  return (
    <SignInDialogContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
          aria-describedby={why ? undefined : ""}
        >
          <div style={{ display: "flex", flexDirection: "column", padding: "8px 10px 4px" }}>
            {/* Names what you clicked. Half of not feeling bounced is still
                knowing where you were — the gate page carries one for the
                same reason. */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
                background: "var(--accent-bg)",
                color: "var(--accent-ink)",
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              {eyebrow}
            </span>

            <DialogTitle
              style={{
                margin: 0,
                fontSize: 21,
                lineHeight: 1.25,
                fontWeight: 800,
                letterSpacing: "-0.018em",
                color: "var(--text)",
                textWrap: "balance",
              }}
            >
              {headline}
            </DialogTitle>

            {why ? (
              <DialogDescription
                style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}
              >
                {why}
              </DialogDescription>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
              <AuthMethods
                idPrefix="rn-signin-dialog"
                onSignedIn={() => setOpen(false)}
                confirmationCopy="Check your inbox to confirm your email, then return to Resunova."
              />
            </div>

            <p
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--border)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--muted)",
              }}
            >
              By continuing you agree to our{" "}
              <a href="/terms" style={{ color: "var(--muted)", fontWeight: 600 }}>Terms</a>{" "}
              and{" "}
              <a href="/privacy" style={{ color: "var(--muted)", fontWeight: 600 }}>Privacy Policy</a>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </SignInDialogContext.Provider>
  );
}
