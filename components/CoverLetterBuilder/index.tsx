"use client";
import React, { useEffect, useState, useRef } from "react";
import { useCoverLetterStore } from "@/store/coverLetterStore";
import CoverLetterTemplatePicker from "./CoverLetterTemplatePicker";
import CoverLetterFormPanel from "./CoverLetterFormPanel";
import { CoverLetterPreview } from "./CoverLetterPreview";
import { CoverLetterEditOverlay } from "./CoverLetterEditOverlay";
import { useHtmlPdfExport } from "@/hooks/useHtmlPdfExport";
import { fetchUserProfile } from "@/lib/supabase";

type TabKey = "recipient" | "author" | "content" | "style";
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "recipient", label: "Recipient", icon: "🏢" },
  { key: "author", label: "About You", icon: "👤" },
  { key: "content", label: "Content", icon: "✍️" },
  { key: "style", label: "Style", icon: "🎨" },
];

export default function CoverLetterBuilder() {
  const store = useCoverLetterStore();
  const { data, loaded, saveStatus } = store;
  
  const [step, setStep] = useState<"pick" | "build">("pick");
  const [activeTab, setActiveTab] = useState<TabKey>("recipient");
  const [editingField, setEditingField] = useState<{ field: string, rect: DOMRect } | null>(null);
  
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

  useEffect(() => {
    store.loadFromStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loaded && data.customization.templateId && (data.content.openingParagraph || data.recipient.companyName)) {
      setStep("build");
    }
  }, [loaded]);

  const handlePrefill = async () => {
    const profile = await fetchUserProfile();
    if (profile) {
      store.prefillFromProfile(profile);
    } else {
      alert("No profile saved yet — visit your Profile page first.");
    }
  };

  const handleDownloadPdf = () => {
    if (previewRef.current) {
        // Disable highlights just like resume builder
      exportPdf(previewRef.current, `CoverLetter.pdf`, { highlightsEnabled: false });
    }
  };

  const handleDownloadDocx = async () => {
    // Phase 2 placeholder
  };

  if (!loaded) return null;

  if (step === "pick") {
    return <CoverLetterTemplatePicker 
      onSelect={(id) => {
        store.setCustomization("templateId", id);
        setStep("build");
      }} 
      onBack={() => setStep("build")}
    />;
  }

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
          <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>Cover Letter Builder</span>
          {saveStatus !== "idle" && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0, color: saveStatus === "error" ? "var(--red)" : "var(--muted)", background: "var(--surface2)" }}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "Error saving"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          <button onClick={handlePrefill} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
            Prefill from Profile
          </button>
          <button disabled title="Coming in Phase 2" onClick={handleDownloadDocx} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "not-allowed", color: "var(--muted)", opacity: 0.6, whiteSpace: "nowrap" }}>
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
