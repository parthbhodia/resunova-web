"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCoverLetterStore } from "@/store/coverLetterStore";
import CoverLetterTemplatePicker from "./CoverLetterTemplatePicker";
import CoverLetterFormPanel from "./CoverLetterFormPanel";
import { CoverLetterPreview } from "./CoverLetterPreview";
import { CoverLetterEditOverlay } from "./CoverLetterEditOverlay";
import { useHtmlPdfExport } from "@/hooks/useHtmlPdfExport";
import { fetchUserProfile, getSupabaseClient } from "@/lib/supabase";
import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { apiUrl, parseJsonOrThrow } from "@/lib/utils";

type TabKey = "recipient" | "author" | "content" | "style";
type Step = "mode" | "pick" | "jd" | "build";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "recipient", label: "Recipient", icon: "🏢" },
  { key: "author", label: "About You", icon: "👤" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "style", label: "Style", icon: "🎨" },
];

export default function CoverLetterBuilder() {
  const store = useCoverLetterStore();
  const { data, loaded, saveStatus, savedId, label } = store;
  const searchParams = useSearchParams();
  const clId = searchParams?.get("cl") ?? null;

  const [step, setStep] = useState<Step>("mode");
  const [activeTab, setActiveTab] = useState<TabKey>("recipient");
  const [editingField, setEditingField] = useState<{ field: string, rect: DOMRect } | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // JD generation state
  const [jdText, setJdText] = useState("");
  const [jdRole, setJdRole] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdGenerating, setJdGenerating] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const { exportPdf, exporting } = useHtmlPdfExport();

  // Responsive: measure the builder's own width (robust to sidebar state) so the
  // two-panel layout stacks and the preview scales to fit instead of overflowing.
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(1200);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // Re-attach once the root div actually mounts (it's absent until loaded && step === "build").
  }, [loaded, step]);
  const narrow = containerW < 880;
  const PANEL_W = 340;
  const PAGE_PX = 816;   // 8.5in @ 96dpi
  const PAGE_H = 1056;   // 11in @ 96dpi
  const previewAvail = (narrow ? containerW : containerW - PANEL_W) - 48;
  const previewScale = Math.max(0.42, Math.min(0.85, previewAvail / PAGE_PX));

  // Load from server if ?cl=<id> is present; otherwise fall back to localStorage.
  // The ref prevents double-loading in React StrictMode (effects run twice in dev).
  const didLoad = useRef(false);
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    if (clId) {
      void store.loadFromServer(clId);
    } else {
      store.loadFromStorage();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saveOnExit = () => {
      store.saveToStorage();
      void store.saveToServer();
    };
    window.addEventListener("pagehide", saveOnExit);
    window.addEventListener("beforeunload", saveOnExit);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      window.removeEventListener("beforeunload", saveOnExit);
    };
  }, [store]);

  useEffect(() => {
    if (loaded && clId) {
      setStep("build");
    }
  }, [loaded, clId]);

  const handlePrefill = async () => {
    const profile = await fetchUserProfile();
    if (profile) {
      store.prefillFromProfile(profile);
    } else {
      alert("No profile saved yet — visit Profile tab first.");
    }
  };

  const handleSave = useCallback(() => {
    void store.saveToServer();
  }, [store]);

  const handleGenerateFromJD = useCallback(async () => {
    setJdError(null);
    setJdGenerating(true);
    try {
      const db = getSupabaseClient();
      const { data: { session } } = await db.auth.getSession();

      const response = await fetch(apiUrl("/api/cl-generate"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          jd: jdText,
          role: jdRole,
          company: jdCompany,
          name: data.author.name || "Applicant",
        }),
      });

      const result = await parseJsonOrThrow<any>(response);
      store.setContent("openingParagraph", result.openingParagraph);
      store.setContent("whyCompany", result.whyCompany);
      store.setContent("whyFit", result.whyFit);
      store.setContent("closingParagraph", result.closingParagraph);
      store.setRecipient("roleTitle", result.roleTitle);
      store.setRecipient("companyName", result.companyName);
      store.setCustomization("templateId", "professional");
      setStep("build");
    } catch (e) {
      setJdError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setJdGenerating(false);
    }
  }, [jdText, jdRole, jdCompany, data.author.name, store]);

  const validateForExport = useCallback((): string | null => {
    const { author, content } = data;
    const missing: string[] = [];
    if (!author.name?.trim()) missing.push("Your Name (About You tab)");
    if (!content.openingParagraph?.trim()) missing.push("Opening Paragraph (Content tab)");
    if (missing.length) {
      return `Please fill in the following before exporting:\n• ${missing.join("\n• ")}`;
    }
    return null;
  }, [data]);

  const handleDownloadPdf = async () => {
    const err = validateForExport();
    if (err) { alert(err); return; }
    if (!previewRef.current) return;
    try {
      await exportPdf(previewRef.current, `CoverLetter.pdf`, { highlightsEnabled: false });
    } catch {
      // Playwright backend not available — fallback to browser print dialog
      const w = window.open("", "_blank");
      if (w && previewRef.current) {
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}@page{size:Letter;margin:0.75in}</style></head><body>${previewRef.current.outerHTML}</body></html>`);
        w.document.close();
        w.onload = () => { w.focus(); w.print(); };
      }
    }
  };

  const handleDownloadDocx = async () => {
    const err = validateForExport();
    if (err) { alert(err); return; }
    const { recipient, author, content } = data;
    const nameBlock = [author.name, author.email, author.phone, author.location, author.linkedin].filter(Boolean);
    const recipientBlock = [recipient.hiringManagerName || "Hiring Manager", recipient.companyName, recipient.companyAddress].filter(Boolean);
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            ...nameBlock.map((line) => new Paragraph({
              children: [new TextRun({ text: line, bold: line === author.name })],
              spacing: { after: 80 },
            })),
            new Paragraph({ text: "", spacing: { after: 220 } }),
            new Paragraph({
              children: [new TextRun(new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))],
              spacing: { after: 220 },
            }),
            ...recipientBlock.map((line) => new Paragraph({
              children: [new TextRun({ text: line })],
              spacing: { after: 80 },
            })),
            new Paragraph({ text: "", spacing: { after: 220 } }),
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun(`Dear ${recipient.hiringManagerName || "Hiring Manager"},`)],
              spacing: { after: 220 },
            }),
            ...[content.openingParagraph, content.whyCompany, content.whyFit, content.closingParagraph]
              .filter(Boolean)
              .flatMap((paragraph) => [
                new Paragraph({
                  children: [new TextRun(paragraph)],
                  spacing: { after: 220 },
                }),
                new Paragraph({ text: "", spacing: { after: 0 } }),
              ]),
            new Paragraph({
              children: [new TextRun("Sincerely,")],
              spacing: { before: 220, after: 120 },
            }),
            new Paragraph({
              children: [new TextRun(author.name || "")],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "CoverLetter.docx"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!loaded) return null;

  // Mode picker: user chooses between "scratch" and "from JD"
  if (step === "mode") {
    const hasDraft = !!(data.content.openingParagraph || data.recipient.companyName);

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "var(--surface)", textAlign: "center" }}>
        <div style={{ maxWidth: 720 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>How would you like to get started?</h1>
          <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 40 }}>Choose your preferred way to create a cover letter.</p>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${hasDraft ? 3 : 2}, 1fr)`, gap: 20 }}>
            {/* From scratch */}
            <button
              onClick={() => { store.reset(); setStep("pick"); }}
              style={{
                padding: 32,
                borderRadius: 12,
                border: "2px solid var(--border)",
                background: "var(--bg)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(88,166,255,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>📝</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>From Scratch</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Pick a template and fill in details manually for full control.</p>
            </button>

            {/* From JD */}
            <button
              onClick={() => { store.reset(); setStep("jd"); setJdError(null); }}
              style={{
                padding: 32,
                borderRadius: 12,
                border: "2px solid var(--border)",
                background: "var(--bg)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(88,166,255,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>✨</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>From Job Description</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Paste a job posting and AI generates a tailored letter instantly.</p>
            </button>

            {/* Resume Draft */}
            {hasDraft && (
              <button
                onClick={() => setStep("build")}
                style={{
                  padding: 32,
                  borderRadius: 12,
                  border: "2px solid var(--accent)",
                  background: "var(--bg)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(88,166,255,0.15)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
              >
                <div style={{ position: "absolute", top: 0, right: 0, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: "0 0 0 8px" }}>DRAFT</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>📂</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Resume Draft</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Continue working on your last unsaved cover letter.</p>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // JD input screen
  if (step === "jd") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px", background: "var(--surface)", minHeight: 0 }}>
        <button
          onClick={() => setStep("mode")}
          style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", marginBottom: 20, textAlign: "left", fontWeight: 500 }}
        >
          ← Back
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 700, margin: "0 auto", width: "100%" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Paste the job description</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>Copy the full job posting. We'll extract the role, company, and craft a tailored cover letter using AI.</p>

          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste job description here..."
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "none",
              marginBottom: 16,
              outline: "none",
            }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                Role (optional)
              </label>
              <input
                value={jdRole}
                onChange={e => setJdRole(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                Company (optional)
              </label>
              <input
                value={jdCompany}
                onChange={e => setJdCompany(e.target.value)}
                placeholder="e.g., Stripe"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
              />
            </div>
          </div>

          {jdError && (
            <div style={{ padding: 12, borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 12, marginBottom: 16 }}>
              {jdError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep("mode")}
              style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateFromJD}
              disabled={!jdText.trim() || jdGenerating}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                border: "none",
                background: jdGenerating ? "var(--surface3)" : "var(--accent)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: jdGenerating ? "wait" : "pointer",
                opacity: jdGenerating || !jdText.trim() ? 0.7 : 1,
              }}
            >
              {jdGenerating ? "Generating…" : "Generate Cover Letter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "pick") {
    return <CoverLetterTemplatePicker 
      onSelect={(id) => {
        store.setCustomization("templateId", id);
        setStep("build");
      }} 
      onBack={() => setStep("mode")}
    />;
  }

  if (step === "build") {
    return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, rowGap: 8, flexWrap: "wrap",
        padding: "10px 16px", minHeight: 52, boxSizing: "border-box",
        borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          <button
            onClick={() => setStep("pick")}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "var(--text)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            ← Change Template
          </button>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={() => {
                const trimmed = titleDraft.trim() || "Untitled Cover Letter";
                store.setLabel(trimmed);
                setEditingTitle(false);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") { setEditingTitle(false); }
              }}
              style={{ fontSize: 14, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "1.5px solid var(--accent)", background: "var(--bg)", color: "var(--text)", outline: "none", minWidth: 180, maxWidth: 280 }}
            />
          ) : (
            <button
              type="button"
              title="Click to rename"
              onClick={() => { setTitleDraft(label); setEditingTitle(true); }}
              style={{ fontSize: 14, fontWeight: 700, background: "none", border: "none", cursor: "text", padding: "3px 4px", borderRadius: 6, color: "var(--text)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {label}
              <span style={{ fontSize: 10, marginLeft: 5, opacity: 0.4 }}>✎</span>
            </button>
          )}
          {saveStatus !== "idle" && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, color: saveStatus === "error" ? "var(--red)" : "var(--muted)", background: "var(--surface2)" }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "Error saving"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            style={{ fontSize: 12, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 6, cursor: saveStatus === "saving" ? "wait" : "pointer", whiteSpace: "nowrap", opacity: saveStatus === "saving" ? 0.8 : 1 }}
            title="Save this cover letter to your Library"
          >
            {saveStatus === "saving" ? "Saving…" : savedId ? "Update Library" : "Save to Library"}
          </button>
          <button onClick={handlePrefill} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
            Prefill from Profile
          </button>
          <button onClick={handleDownloadDocx} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "pointer", color: "var(--text)", whiteSpace: "nowrap" }}>
            ↓ DOCX
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={exporting}
            style={{ fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", padding: "5px 14px", borderRadius: 6, cursor: exporting ? "wait" : "pointer", whiteSpace: "nowrap" }}
          >
            {exporting ? "Generating…" : "↓ PDF"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", flex: 1, overflow: narrow ? "auto" : "hidden" }}>
        {/* Left Panel */}
        <div style={{
          width: narrow ? "100%" : PANEL_W, flexShrink: 0,
          borderRight: narrow ? "none" : "1px solid var(--border)",
          borderBottom: narrow ? "1px solid var(--border)" : "none",
          background: "var(--surface)", display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--border)",
            position: narrow ? "sticky" : "static", top: 0, zIndex: 2, background: "var(--surface)",
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: activeTab === tab.key ? "var(--bg)" : "transparent",
                  border: "none", borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                  borderRight: "1px solid var(--border)", padding: "10px 4px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  color: activeTab === tab.key ? "var(--accent)" : "var(--muted)"
                }}
              >
                <span style={{ fontSize: 15 }}>{tab.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
              </button>
            ))}
          </div>
          {activeTab === "content" && (
            <div style={{ padding: "8px 16px 0", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
              <span>✦</span>
              <span>Type 3+ words in any field to unlock <strong>AI Enhance</strong></span>
            </div>
          )}
          <div style={{ flex: narrow ? "none" : 1, overflowY: narrow ? "visible" : "auto" }}>
            <CoverLetterFormPanel activeTab={activeTab} />
          </div>
        </div>

        {/* Right Panel — scaled-to-fit preview */}
        <div style={{ flex: narrow ? "none" : 1, background: "var(--surface2)", overflow: narrow ? "visible" : "auto", display: "flex", justifyContent: "center", padding: narrow ? "20px 12px 36px" : "28px 20px" }}>
          {/* Sizer reserves the scaled footprint so the page stays centered and never overflows. */}
          <div style={{ width: PAGE_PX * previewScale, height: PAGE_H * previewScale, flexShrink: 0 }}>
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: PAGE_PX }}>
              <CoverLetterPreview ref={previewRef} data={data} onEditField={(field, rect) => setEditingField({ field, rect })} />
            </div>
          </div>
        </div>
      </div>

      {editingField && (
        <CoverLetterEditOverlay 
          field={editingField.field}
          data={data}
          rect={editingField.rect}
          onClose={() => setEditingField(null)}
          onUpdate={(cat, key, val) => {
            if (cat === "recipient") store.setRecipient(key as any, val);
            if (cat === "author") store.setAuthor(key as any, val);
            if (cat === "content") store.setContent(key as any, val);
          }}
        />
      )}
    </div>
    );
  }
}
