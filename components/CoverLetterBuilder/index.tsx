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
      alert("No profile saved yet — visit Profile tab first.");
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 52, borderBottom: "1px solid var(--border)",
        background: "var(--surface)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button 
            onClick={() => setStep("pick")}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "var(--text)", cursor: "pointer" }}
          >
            ← Change Template
          </button>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Cover Letter Builder</span>
          {saveStatus !== "idle" && (
            <span style={{ fontSize: 12, color: saveStatus === "error" ? "var(--red)" : "var(--muted)", marginLeft: 8 }}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Error saving"}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handlePrefill} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
            Prefill from Profile
          </button>
          <button disabled title="Coming in Phase 2" onClick={handleDownloadDocx} style={{ fontSize: 12, background: "var(--surface2)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 6, cursor: "not-allowed", color: "var(--muted)", opacity: 0.6 }}>
            ↓ DOCX
          </button>
          <button 
            onClick={handleDownloadPdf} 
            disabled={exporting}
            style={{ fontSize: 13, fontWeight: 600, background: "var(--accent)", color: "#fff", border: "none", padding: "5px 14px", borderRadius: 6, cursor: exporting ? "wait" : "pointer" }}
          >
            {exporting ? "Generating..." : "↓ PDF"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Panel */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--border)" }}>
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
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CoverLetterFormPanel activeTab={activeTab} />
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ flex: 1, background: "var(--surface2)", overflow: "auto", display: "flex", justifyContent: "center", padding: "28px 20px" }}>
          <div style={{ transform: "scale(0.82)", transformOrigin: "top center", minWidth: "8.5in" }}>
            <CoverLetterPreview ref={previewRef} data={data} onEditField={(field, rect) => setEditingField({ field, rect })} />
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
