import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openReferralResumePdf } from "@/lib/companyReferrers";

/**
 * A referral résumé must not be openable via a link that can be forwarded.
 *
 * ⚠️ WHAT THIS REPLACED, AND WHY IT MATTERED. The résumé used to open through
 * `createSignedUrl`, whose token is a BEARER CREDENTIAL in a query string:
 * anyone holding it reads the file with no login, for an hour. It was opened
 * in a new tab, so it sat in the address bar one copy-paste from leaving the
 * product — and that is literally how it ended up pasted into a WhatsApp
 * thread. The payload is a real person's name, email, phone and work history.
 *
 * ⚠️ THE BUCKET WAS NEVER THE WEAK PART: private, PDF-only, 5MB-capped, with
 * RLS letting a referrer read only a résumé attached to a request on their own
 * desk. What leaked was the handle, not the door — which is why the fix is
 * about the handle and these tests assert the handle's shape.
 */

const downloadMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    storage: { from: () => ({ download: downloadMock }) },
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  downloadMock.mockReset();
});

function stubBlobUrls() {
  const created: string[] = [];
  const revoked: string[] = [];
  // jsdom implements neither.
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => {
    const u = `blob:https://resunova.io/${created.length}`;
    created.push(u);
    return u;
  });
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  return { created, revoked };
}

describe("openReferralResumePdf", () => {
  it("⚠️ hands the browser a blob: URL, never a signed storage link", async () => {
    const { created } = stubBlobUrls();
    downloadMock.mockResolvedValue({ data: new Blob(["pdf"]), error: null });
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);

    const result = await openReferralResumePdf("user-1/abc.pdf");

    expect(result).toEqual({ ok: true });
    const opened = open.mock.calls[0][0] as string;
    expect(opened).toBe(created[0]);
    // The two properties that make it unforwardable, asserted directly:
    expect(opened.startsWith("blob:")).toBe(true);
    // ⚠️ No bearer token may reach the browser. A `?token=` here is the bug.
    expect(opened).not.toContain("token=");
    expect(opened).not.toContain("/storage/v1/object/sign");
  });

  it("asks storage for exactly the requested object", async () => {
    stubBlobUrls();
    downloadMock.mockResolvedValue({ data: new Blob(["pdf"]), error: null });
    vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openReferralResumePdf("  user-1/abc.pdf  ");
    expect(downloadMock).toHaveBeenCalledWith("user-1/abc.pdf");
  });

  it("revokes the blob so it does not outlive the session", async () => {
    vi.useFakeTimers();
    const { created } = stubBlobUrls();
    downloadMock.mockResolvedValue({ data: new Blob(["pdf"]), error: null });
    vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openReferralResumePdf("user-1/abc.pdf");
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(created[0]);
    vi.useRealTimers();
  });

  it("⚠️ falls back to a download when the popup is blocked", async () => {
    // `window.open` after an await is outside the user-gesture window, so
    // browsers block it. Without this the button would silently do nothing.
    stubBlobUrls();
    downloadMock.mockResolvedValue({ data: new Blob(["pdf"]), error: null });
    vi.spyOn(window, "open").mockReturnValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const result = await openReferralResumePdf("user-1/abc.pdf");
    expect(result).toEqual({ ok: true });
    expect(click).toHaveBeenCalled();
  });

  it("reports a storage refusal instead of opening nothing", async () => {
    stubBlobUrls();
    // RLS denying a referrer who does not own the desk arrives as an error.
    downloadMock.mockResolvedValue({ data: null, error: { message: "not authorized" } });
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const result = await openReferralResumePdf("someone-else/abc.pdf");
    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it("refuses an empty path without calling storage", async () => {
    const result = await openReferralResumePdf("   ");
    expect(result.ok).toBe(false);
    expect(downloadMock).not.toHaveBeenCalled();
  });
});

/**
 * ⚠️ THE BEHAVIOURAL TESTS ABOVE CANNOT HOLD AN ABSENCE. Re-adding a
 * signed-URL helper beside `openReferralResumePdf` is a one-line edit that
 * breaks none of them — the opener keeps working, and a second, forwardable
 * path simply exists again. Only a source pin can fail on that.
 *
 * ⚠️ COMMENTS ARE STRIPPED FIRST, and this is not hypothetical bookkeeping:
 * the module's own docstring quotes `createSignedUrl` to explain why it was
 * removed, so a naive scan matches the explanation and passes no matter what
 * the code does. This repo has now shipped that mistake three times.
 */
describe("no forwardable-link producer may come back", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "..", "..", p), "utf8");
  // Block comments, line comments, then string literals — a URL in a toast
  // ("Could not open...") is copy, not a call.
  const code = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  it("⚠️ lib/companyReferrers.ts calls no signed-URL API", () => {
    const src = code(read("lib/companyReferrers.ts"));
    // Control: stripping must not have emptied the file we are scanning.
    expect(src).toContain("openReferralResumePdf");
    expect(src).toContain("createObjectURL");
    // The defect, in each spelling Supabase offers.
    expect(src).not.toContain("createSignedUrl");
    expect(src).not.toContain("createSignedUrls");
    expect(src).not.toContain("getPublicUrl");
  });

  it("⚠️ every résumé call site goes through the blob opener", () => {
    for (const file of [
      "components/profile/CompanyReferrerPanel.tsx",
      "components/refer/ReferralCandidatePacket.tsx",
    ]) {
      const src = code(read(file));
      expect(src, `${file} must open résumés through the blob helper`).toContain(
        "openReferralResumePdf",
      );
      expect(src, `${file} must not build its own storage URL`).not.toContain("createSignedUrl");
      expect(src, `${file} must not reach the bucket directly`).not.toContain(
        "REFERRAL_RESUME_BUCKET",
      );
    }
  });
});
