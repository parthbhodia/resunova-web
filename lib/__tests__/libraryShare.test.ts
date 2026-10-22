import { describe, expect, it } from "vitest";
import { shareTargetFor } from "@/lib/libraryShare";
import type { LibraryItem } from "@/lib/supabase";
import type { ResumeRecord } from "@/lib/types";

const PDF = "https://cdn.example/resume-pdfs/u/analyze-a1.pdf";

function analyzed(analysis: Partial<Extract<LibraryItem, { kind: "analyzed" }>["analysis"]>): LibraryItem {
  return {
    kind: "analyzed",
    key: "analyzed:a1",
    id: "a1",
    title: "Analyzed résumé",
    subtitle: "Resume analysis",
    score: 61,
    createdAt: "2026-10-20T00:00:00Z",
    isDefault: false,
    analysis: { id: "a1", label: "", score: 61, createdAt: "2026-10-20T00:00:00Z", ...analysis },
  } as LibraryItem;
}

function tailored(record: Partial<ResumeRecord>): LibraryItem {
  return {
    kind: "tailored",
    key: "tailored:acme",
    id: "acme",
    title: "Acme",
    subtitle: "SWE",
    score: null,
    createdAt: "2026-10-20T00:00:00Z",
    isDefault: false,
    record: { folder: "acme_swe", tex_path: null, pdf_url: null, ...record } as ResumeRecord,
  } as LibraryItem;
}

describe("shareTargetFor", () => {
  it("shares a scan's uploaded PDF under analyze-<id>", () => {
    expect(shareTargetFor(analyzed({ sourcePdfUrl: PDF }))).toEqual({ folder: "analyze-a1", pdfUrl: PDF });
  });

  it("falls back to the PDF URL kept inside the analysis result", () => {
    expect(shareTargetFor(analyzed({ result: { sourcePdfUrl: PDF } } as never))?.pdfUrl).toBe(PDF);
  });

  it("offers nothing for a scan with no uploaded PDF", () => {
    expect(shareTargetFor(analyzed({ sourcePdfUrl: null }))).toBeNull();
  });

  it("shares a tailored résumé's PDF under its library folder", () => {
    expect(shareTargetFor(tailored({ pdf_url: "https://cdn.example/acme.pdf" })))
      .toEqual({ folder: "acme_swe", pdfUrl: "https://cdn.example/acme.pdf" });
  });

  it("offers nothing for a tailored résumé with no PDF yet", () => {
    expect(shareTargetFor(tailored({}))).toBeNull();
  });

  it("never shares builder drafts or cover letters", () => {
    expect(shareTargetFor({ kind: "builder" } as LibraryItem)).toBeNull();
    expect(shareTargetFor({ kind: "cover_letter" } as LibraryItem)).toBeNull();
  });
});
