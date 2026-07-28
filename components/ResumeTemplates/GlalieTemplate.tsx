import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumePageRootStyle } from "@/lib/resumeLayout";

export function GlalieTemplate({ data, previewRef }: { data: TBResumeData; previewRef?: React.RefObject<HTMLDivElement> }) {
  const { profile, customization, sectionOrder, hiddenSections } = data;
  const ctx = resolveResumeLayout({
    stylePreset: customization?.stylePreset,
    pageWidth: customization?.pageWidth,
    font: customization?.font,
    accentColor: customization?.accentColor ?? "#0284c7",
    fontSize: customization?.fontSize,
  });
  const hidden = new Set(hiddenSections ?? []);

  const contactParts = [
    profile.email, profile.phone, profile.location,
    profile.website, profile.linkedin, profile.github,
  ].filter(Boolean);

  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));

  return (
    <div ref={previewRef} style={{ ...resumePageRootStyle(ctx), borderTop: `8px solid ${ctx.accent}` }}>
      {/* Centered Modern Creative Header */}
      <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "1px dashed #cbd5e1" }}>
        <h1 style={{
          fontSize: ctx.preset.nameFont * 1.4,
          fontWeight: 800,
          color: "#0f172a",
          margin: "0 0 6px 0",
          letterSpacing: "-0.5px"
        }}>
          {profile.name || "Your Name"}
        </h1>
        <div style={{
          fontSize: ctx.preset.metaFont,
          color: ctx.accent,
          fontWeight: 600,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          {contactParts.map((c, i) => (
            <span key={i}>
              {c}{i < contactParts.length - 1 ? " | " : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="glalie-content">
        {visibleSlots.map((slot) => (
          <div key={slot} style={{ marginBottom: ctx.preset.sectionGap }}>
            {renderSectionSlot(slot, data, ctx)}
          </div>
        ))}
      </div>
    </div>
  );
}
