import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInDialogProvider, useSignInDialog } from "@/components/SignInDialog";
import type { SignInAskKey } from "@/components/auth/signInAsk";

const mocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/lib/emailAuth", () => mocks);
vi.mock("@/lib/anonScan", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

function OpenDialogButton({ ask }: { ask?: SignInAskKey }) {
  const { openSignIn } = useSignInDialog();
  return <button onClick={() => openSignIn(ask ? { ask } : undefined)}>Open account dialog</button>;
}

function renderDialog(ask?: SignInAskKey) {
  render(
    <SignInDialogProvider>
      <OpenDialogButton ask={ask} />
    </SignInDialogProvider>,
  );
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Open account dialog" }));
}

/** Email is one click behind Google now, so every email test opens it first. */
async function openEmail(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /continue with email instead/i }));
}

describe("SignInDialog — the resting state is one decision", () => {
  /**
   * ⚠️ THE DEFECT THE REBUILD FIXED. Google sat below an `OR`, under two email
   * fields and a mode toggle — while the gate page led with Google, so the two
   * auth surfaces disagreed about the primary action. Asserting the ORDER, not
   * just presence: both buttons existed before and the order was the bug.
   */
  it("offers Google before email, and no fields at rest", async () => {
    const user = userEvent.setup();
    renderDialog();
    await open(user);

    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();

    const buttons = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const google = buttons.findIndex((t) => /continue with google/i.test(t));
    const email = buttons.findIndex((t) => /continue with email instead/i.test(t));
    expect(google).toBeGreaterThanOrEqual(0);
    expect(email).toBeGreaterThan(google);
  });

  /**
   * Sign-in vs create are the same two fields; the toggle only picked which
   * API call fires. Asking first is a decision before the decision.
   */
  it("has no sign-in / create-account segmented control", async () => {
    const user = userEvent.setup();
    renderDialog();
    await open(user);
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
    await openEmail(user);
    // Once email is open, creating is a link under the button — not a tab above it.
    expect(screen.getByRole("button", { name: /new here\? create an account/i })).toBeInTheDocument();
  });

  /** A real scan runs 30–65s, so "60 seconds" was the worst case sold as the promise. */
  it("makes only checkable assurances", async () => {
    const user = userEvent.setup();
    renderDialog();
    await open(user);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("No credit card")).toBeInTheDocument();
    expect(screen.queryByText(/60 seconds/i)).toBeNull();
  });

  /**
   * ⚠️ The dialog opens because someone clicked something. "Welcome to
   * Resunova" over a specific reason threw away the most persuasive sentence
   * available, and every old title led with our requirement.
   */
  it("leads with the gain for what was clicked, never with 'Sign in to'", async () => {
    const user = userEvent.setup();
    renderDialog("interview_prep");
    await open(user);

    const heading = screen.getByRole("heading").textContent ?? "";
    expect(heading).not.toMatch(/^sign in to/i);
    expect(heading).not.toMatch(/welcome to resunova/i);
    expect(screen.getByText("Interview Prep")).toBeInTheDocument();
  });

  it("falls back to the gate's generic line, not a greeting, with no ask", async () => {
    const user = userEvent.setup();
    renderDialog();
    await open(user);
    const heading = screen.getByRole("heading").textContent ?? "";
    expect(heading).toMatch(/saved and waiting/i);
  });
});

describe("SignInDialog — the email path still works", () => {
  it("logs in with email and password", async () => {
    mocks.signInWithEmail.mockResolvedValue(null);
    const user = userEvent.setup();
    renderDialog();

    await open(user);
    await openEmail(user);
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.signInWithEmail).toHaveBeenCalledWith("student@monroeu.edu", "password123");
  });

  it("shows the email-confirmation state after signup", async () => {
    mocks.signUpWithEmail.mockResolvedValue({ error: null, needsConfirmation: true });
    const user = userEvent.setup();
    renderDialog();

    await open(user);
    await openEmail(user);
    await user.click(screen.getByRole("button", { name: /new here\? create an account/i }));
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox to confirm your email");
  });

  /**
   * Password reset was real functionality on the shipped modal. Losing it in a
   * redesign would be a silent regression, so it is pinned — and the gate page
   * gains it for free now that both render the same form.
   */
  /**
   * ⚠️ CARRIED ACROSS FROM #335, WHICH FIXED THIS ON ITS OWN MODAL REBUILD.
   * Supabase answers a repeated signup (an address first registered with
   * Google, say) with 200, no session, and a user carrying NO identities — so
   * `error` is null and `needsConfirmation` is false. The shipped dialog read
   * that as "check your inbox" and pointed people at an email that never came.
   *
   * ⚠️ AND THE MERGE MADE IT WORSE BEFORE THIS TEST EXISTED: with main's
   * `signUpWithEmail` and this component's old branch set, the success path
   * ran and CLOSED the dialog on someone who was never signed in. The
   * assertion that matters is therefore `onSignedIn` NOT firing.
   */
  it("tells an existing user their account exists instead of promising an email", async () => {
    const user = userEvent.setup();
    mocks.signUpWithEmail.mockResolvedValue({
      error: null,
      needsConfirmation: false,
      alreadyRegistered: true,
    });
    renderDialog();
    await open(user);
    await openEmail(user);
    await user.click(screen.getByRole("button", { name: /new here\? create an account/i }));
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText(/already have an account/i)).toBeTruthy();
    expect(screen.getByText(/emailed a sign-in link/i)).toBeTruthy();
    // Never the confirmation promise that was the original defect.
    expect(screen.queryByText(/finish creating your account/i)).toBeNull();
  });

  /**
   * A typo in a masked field is the commonest reason a correct password is
   * reported as wrong, and the 8-character rule makes it likelier on create.
   */
  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderDialog();
    await open(user);
    await openEmail(user);
    const field = screen.getByLabelText("Password") as HTMLInputElement;
    expect(field.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect((screen.getByLabelText("Password") as HTMLInputElement).type).toBe("password");
  });

  it("keeps the password-reset path", async () => {
    mocks.sendPasswordReset.mockResolvedValue(null);
    const user = userEvent.setup();
    renderDialog();

    await open(user);
    await openEmail(user);
    await user.click(screen.getByRole("button", { name: /forgot your password\?/i }));
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(mocks.sendPasswordReset).toHaveBeenCalledWith("student@monroeu.edu");
    expect(await screen.findByRole("status")).toHaveTextContent("password reset link");
  });
});
