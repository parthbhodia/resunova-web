import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnalyzeUploadLanding } from "@/components/AnalyzeExperience";

/**
 * The sign-in ask lands BEFORE the file picker.
 *
 * Scanning requires an account. A dropzone that accepts a file and then refuses
 * it is the mid-task wall this product's own competitor research names as the
 * loudest complaint about tools like it — the visitor has already chosen a file
 * on the strength of a promise that turns out not to apply to them.
 */

function landing(props: Partial<Parameters<typeof AnalyzeUploadLanding>[0]> = {}) {
  const onBrowseClick = vi.fn();
  const onSignIn = vi.fn();
  const onDrop = vi.fn();
  render(
    <AnalyzeUploadLanding
      jd=""
      onJdChange={() => {}}
      dragging={false}
      onDragOver={() => {}}
      onDragLeave={() => {}}
      onDrop={onDrop}
      onBrowseClick={onBrowseClick}
      error={null}
      {...props}
      onSignIn={onSignIn}
    />,
  );
  return { onBrowseClick, onSignIn, onDrop };
}

describe("Analyze landing · signed out", () => {
  it("asks for sign-in instead of offering a file picker", async () => {
    const { onBrowseClick, onSignIn } = landing({ requiresSignIn: true });

    const zone = screen.getByRole("button", { name: "Sign in to score your résumé" });
    await userEvent.click(zone);

    expect(onSignIn).toHaveBeenCalledTimes(1);
    // The load-bearing half: the file dialog must not open for someone whose
    // scan we are going to refuse.
    expect(onBrowseClick).not.toHaveBeenCalled();
  });

  it("names the free plan rather than a guest allowance", () => {
    landing({ requiresSignIn: true });

    expect(screen.getByText(/3 scans a day/i)).toBeTruthy();
    expect(screen.queryByText(/free scan.? remaining today/i)).toBeNull();
  });

  it("ignores a scansRemaining count if one is somehow passed", () => {
    // Belt and braces: a stale reading must not resurrect the guest-allowance
    // line under a card that is asking the visitor to sign in.
    landing({ requiresSignIn: true, scansRemaining: 1 });

    expect(screen.queryByText(/1 free scan remaining today/i)).toBeNull();
  });

  it("does not offer to drop a file", () => {
    landing({ requiresSignIn: true });
    expect(screen.queryByText(/drop your résumé/i)).toBeNull();
  });

  it("ignores a file dropped on the card", () => {
    // The card no longer says it takes a drop, but a drop still lands on the
    // element. AnalyzeResume's own onFile would ask for sign-in anyway; this
    // pins the outer layer so the zone never LOOKS like it accepted a file.
    const { onDrop, onSignIn } = landing({ requiresSignIn: true });

    fireEvent.drop(screen.getByRole("button", { name: "Sign in to score your résumé" }));

    expect(onDrop).not.toHaveBeenCalled();
    expect(onSignIn).not.toHaveBeenCalled();
  });
});

describe("Analyze landing · signed in (control)", () => {
  it("still accepts a dropped file", () => {
    const { onDrop } = landing({ requiresSignIn: false });

    fireEvent.drop(screen.getByRole("button", { name: "Upload your résumé PDF" }));

    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("still opens the file picker", async () => {
    const { onBrowseClick, onSignIn } = landing({ requiresSignIn: false });

    await userEvent.click(screen.getByRole("button", { name: "Upload your résumé PDF" }));

    expect(onBrowseClick).toHaveBeenCalledTimes(1);
    expect(onSignIn).not.toHaveBeenCalled();
    expect(screen.getByText(/drop your résumé/i)).toBeTruthy();
  });

  it("still shows a real remaining count", () => {
    landing({ requiresSignIn: false, scansRemaining: 2 });
    expect(screen.getByText(/2 free scans remaining today/i)).toBeTruthy();
  });
});
