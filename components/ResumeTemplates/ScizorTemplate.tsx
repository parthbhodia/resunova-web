import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumeContactStyle, resumeNameStyle, resumePageRootStyle } from "@/lib/resumeLayout";

export function ScizorTemplate({ data, previewRef }: { data: TBResumeData; previewRef?: React.RefObject<HTMLDivElement> }) {
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
    <div ref={previewRef} style={resumePageRootStyle(ctx)}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ ...resumeNameStyle(ctx), color: ctx.accent, marginBottom: 8 }}>
          {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </div>
        <div style={{ ...resumeContactStyle(ctx), justifyContent: "center", gap: 12 }}>
          {contactParts.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>{c}</span>
          ))}
        </div>
      </div>
      <div>
        {visibleSlots.map((slot) => {
          return <div key={slot} style={{ marginBottom: ctx.preset.sectionGap }}>
            {renderSectionSlot(slot, data, ctx)}
          </div>;
        })}
      </div>
    </div>
  );
}
