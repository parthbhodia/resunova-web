import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumeContactStyle, resumePageRootStyle } from "@/lib/resumeLayout";

export function ChikoritaTemplate({ data, previewRef }: { data: TBResumeData; previewRef?: React.RefObject<HTMLDivElement> }) {
  const { profile, customization, sectionOrder, hiddenSections } = data;
  const ctx = resolveResumeLayout({
    stylePreset: customization?.stylePreset,
    pageWidth: customization?.pageWidth,
    font: customization?.font,
    accentColor: customization?.accentColor ?? "#059669",
    fontSize: customization?.fontSize,
  });
  const hidden = new Set(hiddenSections ?? []);

  const contactParts = [
    profile.email, profile.phone, profile.location,
    profile.website, profile.linkedin, profile.github,
  ].filter(Boolean);

  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));

  return (
    <div ref={previewRef} style={{ ...resumePageRootStyle(ctx), backgroundColor: "#f8fafc" }}>
      {/* Top Banner Header */}
      <div style={{
        backgroundColor: ctx.accent,
        color: "#ffffff",
        padding: "24px 28px",
        margin: `-${ctx.page.paddingY}px -${ctx.page.paddingX}px 24px -${ctx.page.paddingX}px`,
        borderRadius: "0 0 12px 12px",
      }}>
        <h1 style={{
          fontSize: ctx.preset.nameFont * 1.3,
          fontWeight: 800,
          margin: "0 0 8px 0",
          letterSpacing: "0.5px",
          color: "#ffffff",
        }}>
          {profile.name || "Your Name"}
        </h1>
        <div style={{
          fontSize: ctx.preset.metaFont,
          color: "rgba(255, 255, 255, 0.9)",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          fontWeight: 500,
        }}>
          {contactParts.map((c, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
              {c}{i < contactParts.length - 1 ? " • " : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="chikorita-content">
        {visibleSlots.map((slot) => (
          <div key={slot} style={{ marginBottom: ctx.preset.sectionGap }}>
            {renderSectionSlot(slot, data, ctx)}
          </div>
        ))}
      </div>
    </div>
  );
}
