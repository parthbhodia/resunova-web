import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadRemotePdf, pdfFileName } from "@/lib/downloadRemotePdf";

describe("pdfFileName", () => {
  it("keeps a pdf extension and strips path characters", () => {
    expect(pdfFileName("Alex Rivera.pdf")).toBe("Alex Rivera.pdf");
    expect(pdfFileName("reports/Alex: Rivera")).toBe("reports Alex Rivera.pdf");
  });

  it("falls back when the name is empty", () => {
    expect(pdfFileName("   ")).toBe("resume.pdf");
  });
});

describe("downloadRemotePdf", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves the file from the response without navigating", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => blob })));
    const createObjectURL = vi.fn(() => "blob:resume");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: "", download: "", click, remove } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);

    await downloadRemotePdf("https://files.example/resume.pdf", "Alex Rivera");

    expect(fetch).toHaveBeenCalledWith("https://files.example/resume.pdf");
    expect(anchor.download).toBe("Alex Rivera.pdf");
    expect(anchor.href).toBe("blob:resume");
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
  });

  it("rejects a failed fetch", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, blob: async () => new Blob() })));
    await expect(downloadRemotePdf("https://files.example/missing.pdf", "resume")).rejects.toThrow(
      "Could not download this PDF.",
    );
  });
});
