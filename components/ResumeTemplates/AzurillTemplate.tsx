import React from "react";
import type { TBResumeData } from "../TemplateBuilder/types";
import { isCoreSectionSlot, parseCustomSectionId } from "../TemplateBuilder/types";
import { renderSectionSlot } from "../TemplateBuilder/renderResumeSections";
import { resolveResumeLayout, resumeNameStyle, resumePageRootStyle } from "@/lib/resumeLayout";

const TWO_COL_SIDEBAR_CORE = new Set(["education", "skills"]);

function isSidebarSlot(slot: string): boolean {
  if (TWO_COL_SIDEBAR_CORE.has(slot)) return true;
  if (parseCustomSectionId(slot) !== null) return true;
  return false;
}

export function AzurillTemplate({ data }: { data: TBResumeData }) {
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
  const sidebarSlots = visibleSlots.filter(isSidebarSlot);
  const mainSlots    = visibleSlots.filter((s) => !isSidebarSlot(s));

  // Azurill style: Dark sidebar with white text
  const sidebarBg = ctx.accent;
  const sidebarTextColor = "#ffffff";

  // Override context to force white text in the sidebar for headers and text
  const sidebarCtx = {
    ...ctx,
    accent: sidebarTextColor, 
  };

  return (
    <div
      style={{
        ...resumePageRootStyle(ctx),
        padding: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        backgroundColor: "#ffffff",
      }}
    >
      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: "35%",
          flexShrink: 0,
          background: sidebarBg,
          color: sidebarTextColor,
          padding: `${ctx.page.paddingY}px ${Math.round(ctx.page.paddingX * 0.85)}px`,
          boxSizing: "border-box",
        }}
      >
        <div style={{ ...resumeNameStyle(sidebarCtx), color: sidebarTextColor, fontSize: ctx.preset.nameFont * 0.9, marginBottom: 12 }}>
          {profile.name || <span style={{ opacity: 0.7 }}>Your Name</span>}
        </div>
        <div style={{
          fontSize: ctx.preset.metaFont,
          color: "rgba(255,255,255,0.85)",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          wordBreak: "break-word",
        }}>
          {contactParts.map((c, i) => <span key={i}>{c}</span>)}
        </div>

        {/* Sidebar body sections. We force renderSectionSlot to use sidebarCtx so it inherits the white color */}
        <div className="azurill-sidebar">
          {sidebarSlots.map((slot) => (
            <div key={slot} style={{ color: sidebarTextColor }}>
              {renderSectionSlot(slot, data, sidebarCtx)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: `${ctx.page.paddingY}px ${ctx.page.paddingX}px`,
          boxSizing: "border-box",
        }}
      >
        {mainSlots.map((slot) => (
          <div key={slot}>{renderSectionSlot(slot, data, ctx)}</div>
        ))}
        {mainSlots.length === 0 && (
          <p style={{ color: "#bbb", fontSize: 13, marginTop: 24 }}>
            Summary, Experience, and Projects appear here.
          </p>
        )}
      </div>
      
      {/* CSS overrides for the sidebar to force text to be white */}
      <style dangerouslySetInnerHTML={{__html: `
        .azurill-sidebar * {
          color: white !important;
          border-color: rgba(255,255,255,0.5) !important;
        }
      `}} />
    </div>
  );
}
