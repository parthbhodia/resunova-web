import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInDialogProvider, useSignInDialog } from "@/components/SignInDialog";

const mocks = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/lib/emailAuth", () => mocks);
vi.mock("@/lib/anonScan", () => ({ signInWithGoogle: mocks.signInWithGoogle }));

function OpenDialogButton() {
  const { openSignIn } = useSignInDialog();
  return <button onClick={() => openSignIn()}>Open account dialog</button>;
}

function renderDialog() {
  render(
    <SignInDialogProvider>
      <OpenDialogButton />
    </SignInDialogProvider>,
  );
}

describe("SignInDialog", () => {
  it("logs in with email and password", async () => {
    mocks.signInWithEmail.mockResolvedValue(null);
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    await user.type(await screen.findByLabelText(/^Email/), "student@monroeu.edu");
    await user.type(screen.getByLabelText(/^Password/), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.signInWithEmail).toHaveBeenCalledWith("student@monroeu.edu", "password123");
  });

  it("shows the email-confirmation state after signup", async () => {
    mocks.signUpWithEmail.mockResolvedValue({ error: null, needsConfirmation: true, alreadyRegistered: false });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    await user.click(await screen.findByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText(/^Email/), "student@monroeu.edu");
    await user.type(screen.getByLabelText(/^Password/), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("We sent a link to student@monroeu.edu");
  });

  it("tells an existing user they already have an account instead of promising a confirmation email", async () => {
    mocks.signUpWithEmail.mockResolvedValue({ error: null, needsConfirmation: false, alreadyRegistered: true });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    await user.click(await screen.findByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText(/^Email/), "student@monroeu.edu");
    await user.type(screen.getByLabelText(/^Password/), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("You already have an account");
    expect(status).toHaveTextContent("Continue with Google");
    expect(screen.getByRole("heading", { name: "Sign in to Resunova" })).toBeInTheDocument();
  });

  it("puts Google first and loads the brand mark, not a generic icon", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open account dialog" }));

    const google = await screen.findByRole("button", { name: "Continue with Google" });
    const email = screen.getByLabelText(/^Email/);
    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("img", { name: "Resunova" })).toHaveAttribute("src", expect.stringContaining("icon-192.png"));
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Open account dialog" }));

    const password = await screen.findByLabelText(/^Password/);
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
