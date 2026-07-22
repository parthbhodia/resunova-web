import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumeContactStyle, resumePageRootStyle } from "@/lib/resumeLayout";

export function OnyxTemplate({ data, previewRef }: { data: TBResumeData; previewRef?: React.RefObject<HTMLDivElement> }) {
  const { profile, customization, sectionOrder, hiddenSections } = data;
  const ctx = resolveResumeLayout({
    stylePreset: customization?.stylePreset,
    pageWidth: customization?.pageWidth,
    font: customization?.font,
    accentColor: customization?.accentColor,
    fontSize: customization?.fontSize,
  });
  const hidden = new Set(hiddenSections ?? []);

  const contactParts = [
    profile.email, profile.phone, profile.location,
    profile.website, profile.linkedin, profile.github,
  ].filter(Boolean);

  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));

  return (
    <div
      ref={previewRef}
      style={{
        ...resumePageRootStyle(ctx),
        borderTop: `12px solid ${ctx.accent}`,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ 
          fontSize: ctx.preset.nameFont * 1.2, 
          fontFamily: ctx.fontStack, 
          fontWeight: 700,
          color: ctx.accent,
          margin: "0 0 8px 0",
          letterSpacing: 1
        }}>
          {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </h1>
        
        <div style={{ ...resumeContactStyle(ctx), justifyContent: "center", gap: 12 }}>
          {contactParts.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="onyx-content">
        {visibleSlots.map((slot) => {
          return <div key={slot} style={{ marginBottom: ctx.preset.sectionGap }}>
            {renderSectionSlot(slot, data, ctx)}
          </div>;
        })}
      </div>
    </div>
  );
}
