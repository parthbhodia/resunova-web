import { describe, expect, it, vi } from "vitest";
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
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Log in with email" }));

    expect(mocks.signInWithEmail).toHaveBeenCalledWith("student@monroeu.edu", "password123");
  });

  it("shows the email-confirmation state after signup", async () => {
    mocks.signUpWithEmail.mockResolvedValue({ error: null, needsConfirmation: true });
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Open account dialog" }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.type(screen.getByLabelText("Email"), "student@monroeu.edu");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create free account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Check your inbox to confirm your email");
  });
});
