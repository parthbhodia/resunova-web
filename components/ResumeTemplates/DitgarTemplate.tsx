import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumePageRootStyle } from "@/lib/resumeLayout";

export function DitgarTemplate({ data, previewRef }: { data: TBResumeData; previewRef?: React.RefObject<HTMLDivElement> }) {
  const { profile, customization, sectionOrder, hiddenSections } = data;
  const ctx = resolveResumeLayout({
    stylePreset: customization?.stylePreset,
    pageWidth: customization?.pageWidth,
    font: customization?.font,
    accentColor: customization?.accentColor ?? "#7c3aed",
    fontSize: customization?.fontSize,
  });
  const hidden = new Set(hiddenSections ?? []);

  const contactParts = [
    profile.email, profile.phone, profile.location,
    profile.website, profile.linkedin, profile.github,
  ].filter(Boolean);

  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));

  return (
    <div ref={previewRef} style={{ ...resumePageRootStyle(ctx), borderLeft: `8px solid ${ctx.accent}` }}>
      {/* Left-aligned clean modern header with colored accent bar */}
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${ctx.accent}` }}>
        <h1 style={{
          fontSize: ctx.preset.nameFont * 1.35,
          fontWeight: 800,
          color: ctx.accent,
          margin: "0 0 6px 0",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          {profile.name || "Your Name"}
        </h1>
        <div style={{
          fontSize: ctx.preset.metaFont + 0.5,
          color: "#475569",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          fontWeight: 500
        }}>
          {contactParts.map((c, i) => (
            <span key={i} style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="ditgar-content">
        {visibleSlots.map((slot) => (
          <div key={slot} style={{ marginBottom: ctx.preset.sectionGap }}>
            {renderSectionSlot(slot, data, ctx)}
          </div>
        ))}
      </div>
    </div>
  );
}
