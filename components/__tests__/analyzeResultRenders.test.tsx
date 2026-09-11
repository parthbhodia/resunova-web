import { Component, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import AnalyzeResume from "@/components/AnalyzeResume";
import { fetchAnalyses } from "@/lib/supabase";
import { FIXTURE_ANALYSIS_ID, FIXTURE_NAME } from "./fixtures/analyzeResultFixture";

/**
 * Opening any Analyze result crashed the whole app to the root error page.
 *
 * React #185, "Maximum update depth exceeded", thrown from AnnotatedResumePanel.
 * `gapFixTargetBulletIndices = []` sat in the dependency list of the callback
 * that positions the preview's highlight frame, so every render made a new
 * callback, the layout effect keyed on it re-ran, and the setState inside it
 * started the next render. Only Tailor passes that prop, so only Analyze looped.
 *
 * These mount the real result view rather than the panel alone, because what
 * has to survive is every way into a result: a saved analysis opened by URL
 * and a scan that just finished.
 */

const nav = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  const { analysisRecordFixture, analysisResultFixture, FIXTURE_USER_ID } = await import(
    "./fixtures/analyzeResultFixture"
  );
  const user = { id: FIXTURE_USER_ID, email: "jordan.rivera@example.com" };
  // Signed in, with one saved analysis. Any other query the page makes resolves empty.
  const emptyQuery = (): unknown =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === "then"
            ? (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null })
            : () => emptyQuery(),
      },
    );
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      getSession: async () => ({ data: { session: { user, access_token: "test-token" } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => emptyQuery(),
    rpc: () => emptyQuery(),
  };
  return {
    ...actual,
    getSupabaseClient: () => client,
    fetchAnalyses: vi.fn(async () => [analysisRecordFixture]),
    fetchAnalysisById: vi.fn(async () => ({ ...analysisRecordFixture, result: analysisResultFixture })),
    insertAnalysis: vi.fn(async () => null),
    createAnalysisVersion: vi.fn(async () => null),
    deleteAnalysis: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  const { analysisResultFixture, FIXTURE_ANALYSIS_ID } = await import("./fixtures/analyzeResultFixture");
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  return {
    ...actual,
    apiFetch: vi.fn(async (path: string) => {
      if (path.startsWith("/api/scan-limit-status")) {
        return json(200, { enforced: true, unlimited: true, plan: "pro" });
      }
      if (path.startsWith("/api/analyze-upload")) {
        return json(200, { ...analysisResultFixture, analysisId: FIXTURE_ANALYSIS_ID, analysisPersisted: true });
      }
      return json(404, { error: "not stubbed in this test" });
    }),
  };
});

vi.mock("@/components/SignInDialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/SignInDialog")>()),
  useSignInDialog: () => ({ openSignIn: vi.fn() }),
}));

vi.mock("@/components/UpgradeDialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/UpgradeDialog")>()),
  useUpgradeDialog: () => ({ openUpgrade: vi.fn() }),
}));

/** Stands in for the root error boundary, so a crash fails the test with its own message. */
class CrashRecorder extends Component<
  { onCrash: (error: Error) => void; children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onCrash(error);
  }

  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

function renderAnalyze() {
  const crash: { error: Error | null } = { error: null };
  const view = render(
    <CrashRecorder
      onCrash={(error) => {
        crash.error = error;
      }}
    >
      <AnalyzeResume />
    </CrashRecorder>,
  );
  return { container: view.container, crash };
}

function previewName(container: HTMLElement) {
  return container.querySelector('.rw-annotated-panel [data-field-path="header.name"]');
}

/** Waits until the result view has either painted the résumé or crashed, then requires the former. */
async function expectResultRendered(container: HTMLElement, crash: { error: Error | null }) {
  await waitFor(
    () => {
      if (crash.error) return;
      expect(previewName(container)).not.toBeNull();
    },
    { timeout: 5000 },
  );
  expect(crash.error?.message ?? null).toBeNull();
  expect(previewName(container)?.textContent).toContain(FIXTURE_NAME);
}

describe("Analyze result view", () => {
  it("renders a saved analysis opened by URL", async () => {
    nav.searchParams = new URLSearchParams(`view=analyze&analysis=${FIXTURE_ANALYSIS_ID}`);

    const { container, crash } = renderAnalyze();

    await expectResultRendered(container, crash);
  });

  it("renders a saved analysis opened from Recent analyses", async () => {
    nav.searchParams = new URLSearchParams("view=analyze");

    const { container, crash } = renderAnalyze();
    const row = await waitFor(() => {
      const button = Array.from(container.querySelectorAll("button")).find((b) =>
        (b.textContent ?? "").includes(FIXTURE_NAME),
      );
      expect(button).toBeDefined();
      return button as HTMLButtonElement;
    });
    fireEvent.click(row);

    await expectResultRendered(container, crash);
  });

  it("renders the result of a scan that just finished", async () => {
    nav.searchParams = new URLSearchParams("view=analyze");

    const { container, crash } = renderAnalyze();
    // Signed in before the file arrives, as it is for anyone who can scan.
    await waitFor(() => expect(fetchAnalyses).toHaveBeenCalled());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" })] },
    });

    await expectResultRendered(container, crash);
  });
});
