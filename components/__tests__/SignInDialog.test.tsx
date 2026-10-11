import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInDialogProvider, useSignInDialog } from "@/components/SignInDialog";

const mocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/lib/emailAuth", () => mocks);
vi.mock("@/lib/anonScan", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

const SRC = readFileSync("components/SignInDialog.tsx", "utf8");

function OpenDialogButton({ reason }: { reason?: string }) {
  const { openSignIn } = useSignInDialog();
  return (
    <button onClick={() => openSignIn(reason ? { reason } : undefined)}>
      Open account dialog
    </button>
  );
}

function renderDialog(reason?: string) {
  return render(
    <SignInDialogProvider>
      <OpenDialogButton reason={reason} />
    </SignInDialogProvider>,
  );
}

/**
 * Email now sits behind `Use email instead`, so reaching the form is one extra
 * click. Both of these drive the whole path rather than the form in isolation:
 * if the disclosure stops revealing the form, every email sign-in in the app is
 * unreachable and these go red.
 */
async function openEmailForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open account dialog" }));
  await user.click(screen.getByRole("button", { name: "Use email instead" }));
}

describe("SignInDialog", () => {
  it("logs in with email and password", async () => {
    mocks.signInWithEmail.mockResolvedValue(null);
    const user = userEvent.setup();
    renderDialog();

    await openEmailForm(user);
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in with email" }));

    expect(mocks.signInWithEmail).toHaveBeenCalledWith("student@monroeu.edu", "password123");
  });

  it("shows the email-confirmation state after signup", async () => {
    mocks.signUpWithEmail.mockResolvedValue({ error: null, needsConfirmation: true });
    const user = userEvent.setup();
    renderDialog();

    await openEmailForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create free account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox to confirm your email");
  });

  /**
   * The card used to ship two full-width filled `size="lg"` buttons separated by
   * "or". Counting the controls that carry primary weight is the mechanical
   * proxy for "one primary action per screen"; asserting only that Google is
   * present passes happily while the email slab sits next to it.
   */
  it("offers exactly one primary on first paint, and it is Google", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Open account dialog" }));

    const primaries = [...baseElement.querySelectorAll("[data-signin]")];
    expect(primaries.map((el) => el.getAttribute("data-signin"))).toEqual(["google"]);
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("keeps Google reachable once email is open, below the email submit", async () => {
    const user = userEvent.setup();
    const { baseElement } = renderDialog();
    await openEmailForm(user);

    // Document order is the hierarchy: email submit first, Google after it.
    const primaries = [...baseElement.querySelectorAll("[data-signin]")];
    expect(primaries.map((el) => el.getAttribute("data-signin"))).toEqual([
      "email-submit",
      "google",
    ]);
  });

  /**
   * Both directions. A caller's own sentence must win, and the generic list
   * must still appear when there is nothing specific to say — a test that only
   * checks the suppression passes if the list is deleted outright.
   */
  it("shows the generic value props only when the caller named no reason", async () => {
    const user = userEvent.setup();
    const { unmount } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    expect(screen.getByText("No credit card")).toBeTruthy();
    unmount();

    renderDialog("Create a free account to tailor your résumé to this job.");
    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    expect(screen.getByText("Create a free account to tailor your résumé to this job.")).toBeTruthy();
    expect(screen.queryByText("No credit card")).toBeNull();
  });

  /**
   * The segmented control used to light "Log in" as selected while the form
   * below it was the reset form and its button said "Send reset link". The
   * heading states the mode now, so there is nothing left to disagree with it.
   */
  it("says it is resetting a password while it is resetting a password", async () => {
    const user = userEvent.setup();
    renderDialog();
    await openEmailForm(user);
    await user.click(screen.getByRole("button", { name: "Forgot your password?" }));

    expect(screen.getByText("Reset your password")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.queryByRole("button", { name: "Log in with email" })).toBeNull();
  });

  /**
   * Source pins, both at baseline ZERO.
   *
   * `dark:` is bound to a `.dark` ancestor class (`@custom-variant dark
   * (&:is(.dark *))`) and nothing in this app sets that class, so a `dark:`
   * utility on this file never fires. The two it shipped with (`dark:bg-white
   * dark:text-[#1f2937]`) were inert and read as a dark-mode decision that was
   * never actually taken.
   */
  it("uses no Tailwind dark: variant, which is dead under [data-theme]", () => {
    expect(SRC.match(/\bdark:[a-z[]/g) ?? []).toEqual([]);
  });

  /**
   * `--on-fill` exists because every hue token here is tuned to be readable AS
   * TEXT on the theme background, so in dark mode they are all light: good
   * fills, bad grounds for white. The variant default `text-primary-foreground`
   * is a hardcoded #ffffff and measures 2.53:1 on --accent in dark.
   */
  it("gives the filled submit --on-fill rather than a hardcoded white", () => {
    expect(SRC).toContain('className="w-full text-[var(--on-fill)]"');
    // No className may fall back to the variant default.
    expect(SRC.match(/className="[^"]*text-primary-foreground/g) ?? []).toEqual([]);
    // And no filled control may set a white FOREGROUND on a hue token. Scoped
    // the same way the repo's existing rule is: a white *background* is fine
    // and is in fact what Google's brand asks for, so a bare /#fff/ scan would
    // flag the one place white is correct.
    expect(
      SRC.match(
        /background\s*:\s*[^";\n]*"var\(--(?:accent|green|red|amber|yellow|orange)[a-z0-9-]*[^"]*"[^}]{0,240}?color\s*:\s*"#f{3,6}"/gi,
      ) ?? [],
    ).toEqual([]);
  });
});
