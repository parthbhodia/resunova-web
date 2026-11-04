/**
 * The referral ask form's sign-in key, pinned AT THE CALL SITE.
 *
 * ⚠️ WHY THIS FILE EXISTS SEPARATELY FROM signInAsk.test.ts. That file pins the
 * RULE — that `referral_ask` resolves to copy leading with the gain. This one
 * pins that the form actually PASSES that key. The distinction is not academic:
 * this exact gap already shipped once. `joinReferrerSentences` had its own unit
 * tests while every component fixture carried a non-empty title, so reverting a
 * call site to the broken template left the entire suite green.
 *
 * The specific regression guarded here is a call reverting to the DELETED
 * `openSignIn({ title, reason })` options. A bare `toHaveBeenCalled()` passes
 * against an API that no longer exists, which is how main's own rewrite shipped
 * a call that did not compile against this branch.
 *
 * The path is live rather than theoretical: openSignIn fires when the server
 * refuses the submit with "sign_in", which a stale session reaches even after
 * the page-level Google gate has let someone through.
 */
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockOpenSignIn, mockSubmit } = vi.hoisted(() => ({
  mockOpenSignIn: vi.fn(),
  mockSubmit: vi.fn(),
}));

vi.mock("@/components/SignInDialog", () => ({
  useSignInDialog: () => ({ openSignIn: mockOpenSignIn }),
}));

vi.mock("@/hooks/usePublicReferral", () => ({
  useReferralAsk: () => ({
    form: { name: "", email: "", role: "", note: "", link: "" },
    setForm: vi.fn(),
    saving: false,
    done: false,
    error: null,
    submit: mockSubmit,
  }),
}));

import { ReferrerRequestForm } from "@/components/refer/ReferrerRequestForm";

const REFERRER = {
  id: "r1",
  slug: "alex-kim",
  displayName: "Alex Kim",
  company: "Acme",
  companySlug: "acme",
  title: "Staff Engineer",
  bio: "Happy to refer.",
  linkedin: null,
  referredCount: 3,
  isOpen: true,
} as never;

describe("referral ask: sign-in key at the call site", () => {
  beforeEach(() => {
    mockOpenSignIn.mockClear();
    mockSubmit.mockReset();
  });

  it("passes the keyed ask, and no hand-written copy, on a sign_in refusal", async () => {
    mockSubmit.mockResolvedValue("sign_in");
    const { container } = render(<ReferrerRequestForm referrer={REFERRER} />);

    // Submit the form directly rather than clicking the button: jsdom does not
    // reliably dispatch submit from a type="submit" click here, and the handler
    // under test is bound to the form's onSubmit either way.
    fireEvent.submit(container.querySelector("form")!);

    // waitFor, because the handler awaits ask.submit() — asserting straight
    // after the click reads 0 calls whether or not the code is correct.
    // Pin the KEY, not merely that it was called: the deleted { title, reason }
    // shape would satisfy a bare toHaveBeenCalled().
    await waitFor(() => expect(mockOpenSignIn).toHaveBeenCalledWith({ ask: "referral_ask" }));
    const [options] = mockOpenSignIn.mock.calls[0];
    expect(Object.keys(options)).toEqual(["ask"]);
  });

  it("does not open sign-in when the submit succeeds", async () => {
    mockSubmit.mockResolvedValue("ok");
    const { container } = render(<ReferrerRequestForm referrer={REFERRER} />);

    fireEvent.submit(container.querySelector("form")!);

    // ⚠️ Wait for the submit to RESOLVE first. Asserting an absence immediately
    // after the click passes whether or not the guard exists, because nothing
    // has run yet — the first draft of this test did exactly that.
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    await Promise.resolve();
    expect(mockOpenSignIn).not.toHaveBeenCalled();
  });
});
