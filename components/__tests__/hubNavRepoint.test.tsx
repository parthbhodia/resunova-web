import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { AppBottomNav } from "@/components/app-shell/AppBottomNav";
import { MyResumesRedirect } from "@/app/my-resumes/redirect-client";

/* R3 (eng review, M1): every nav entry lands on the hub (view=library) — none
 * may route to the retired /my-resumes workspace. The route itself survives
 * only as a client redirect for old deep links. */

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

function renderBottomNav(over: Partial<Parameters<typeof AppBottomNav>[0]> = {}) {
  return render(
    <AppBottomNav
      active="home"
      builderActive={false}
      onSelect={over.onSelect ?? vi.fn()}
      onBuilder={vi.fn()}
      theme="dark"
      onToggleTheme={vi.fn()}
      onHistoryOpen={vi.fn()}
      onBugReport={vi.fn()}
      onSignOut={vi.fn()}
      userInitial="P"
      {...over}
    />,
  );
}

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
});

describe("M1 nav repoint — the hub is the one résumés home", () => {
  it("mobile Resumes tab selects the library view instead of pushing /my-resumes", () => {
    const onSelect = vi.fn();
    const { getByText } = renderBottomNav({ onSelect });
    fireEvent.click(getByText("Resumes"));
    expect(onSelect).toHaveBeenCalledWith("library");
    expect(push).not.toHaveBeenCalled();
  });

  it("mobile Resumes tab is active on the library view, not tied to a pathname", () => {
    const { getByText } = renderBottomNav({ active: "library" });
    const tab = getByText("Resumes").closest("button");
    expect(tab?.getAttribute("data-active")).toBe("true");
  });

  it("anon visitors get the sign-in gate from the Resumes tab", () => {
    const onSelect = vi.fn();
    const onSignIn = vi.fn();
    const { getByText } = renderBottomNav({ onSelect, anonMode: true, onSignIn });
    fireEvent.click(getByText("Resumes"));
    expect(onSignIn).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("/my-resumes renders nothing and client-redirects to the hub", async () => {
    const { container } = render(<MyResumesRedirect />);
    expect(container.firstChild).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/?view=library"));
    expect(push).not.toHaveBeenCalled();
  });
});
