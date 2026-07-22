"use client";
import { forwardRef } from "react";
import type { TBResumeData } from "./types";
import { parseCustomSectionId } from "./types";
import { renderSectionSlot } from "./renderResumeSections";
import {
  resolveResumeLayout,
  resumeContactStyle,
  resumeNameStyle,
  resumePageRootStyle,
} from "@/lib/resumeLayout";

import { AzurillTemplate } from "../ResumeTemplates/AzurillTemplate";
import { OnyxTemplate } from "../ResumeTemplates/OnyxTemplate";
import { BronzorTemplate } from "../ResumeTemplates/BronzorTemplate";
import { ChikoritaTemplate } from "../ResumeTemplates/ChikoritaTemplate";
import { DitgarTemplate } from "../ResumeTemplates/DitgarTemplate";
import { DittoTemplate } from "../ResumeTemplates/DittoTemplate";
import { GengarTemplate } from "../ResumeTemplates/GengarTemplate";
import { GlalieTemplate } from "../ResumeTemplates/GlalieTemplate";
import { KakunaTemplate } from "../ResumeTemplates/KakunaTemplate";
import { LaprasTemplate } from "../ResumeTemplates/LaprasTemplate";
import { LeafishTemplate } from "../ResumeTemplates/LeafishTemplate";
import { MeowthTemplate } from "../ResumeTemplates/MeowthTemplate";
import { PikachuTemplate } from "../ResumeTemplates/PikachuTemplate";
import { RhyhornTemplate } from "../ResumeTemplates/RhyhornTemplate";
import { ScizorTemplate } from "../ResumeTemplates/ScizorTemplate";

/**
 * Two-column layout section assignment:
 *
 *  Sidebar (left, ~33%): Education, Skills, and all custom sections.
 *  Main column (right, ~67%): Summary, Experience, Projects.
 *
 * The user's sectionOrder controls ordering *within* each column.
 * hiddenSections suppresses slots in both columns as normal.
 */
const TWO_COL_SIDEBAR_CORE = new Set(["education", "skills"]);

function isSidebarSlot(slot: string): boolean {
  if (TWO_COL_SIDEBAR_CORE.has(slot)) return true;
  if (parseCustomSectionId(slot) !== null) return true;
  return false;
}

const ResumePreview = forwardRef<HTMLDivElement, { data: TBResumeData }>(function ResumePreview({ data }, ref) {
  const { profile, customization, sectionOrder, hiddenSections } = data;
  const layout = customization?.layout ?? "single";
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

  // ── Custom Structural Templates ──────────────────────────────────────────
  const isCorePreset = !customization?.stylePreset || ["executive", "modern", "classic"].includes(customization.stylePreset);
  if (!isCorePreset) {
    const presetId = customization.stylePreset!;
    
    const templates: Record<string, React.FC<any>> = {
      azurill: AzurillTemplate,
      onyx: OnyxTemplate,
      bronzor: BronzorTemplate,
      chikorita: ChikoritaTemplate,
      ditgar: DitgarTemplate,
      ditto: DittoTemplate,
      gengar: GengarTemplate,
      glalie: GlalieTemplate,
      kakuna: KakunaTemplate,
      lapras: LaprasTemplate,
      leafish: LeafishTemplate,
      meowth: MeowthTemplate,
      pikachu: PikachuTemplate,
      rhyhorn: RhyhornTemplate,
      scizor: ScizorTemplate,
    };

    const TemplateComp = templates[presetId];
    if (TemplateComp) {
      return <TemplateComp previewRef={ref as any} data={data} />;
    } else {
      console.error("Failed to load template:", presetId);
    }
  }

  // ── Single-column layout (default) ─────────────────────────────────────────
  if (layout !== "twoColumn") {
    return (
      <div ref={ref} style={resumePageRootStyle(ctx)}>
        <div style={resumeNameStyle(ctx)}>
          {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </div>
        <div style={resumeContactStyle(ctx)}>
          {contactParts.map((c, i) => (
            <span key={i}>{c}{i < contactParts.length - 1 ? " | " : ""}</span>
          ))}
        </div>

        {sectionOrder.map((slot) => {
          if (hidden.has(slot)) return null;
          return <div key={slot}>{renderSectionSlot(slot, data, ctx)}</div>;
        })}
      </div>
    );
  }

  // ── Two-column layout ───────────────────────────────────────────────────────
  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));
  const sidebarSlots = visibleSlots.filter(isSidebarSlot);
  const mainSlots    = visibleSlots.filter((s) => !isSidebarSlot(s));

  // Sidebar gets a tinted background using the accent at ~10% opacity.
  const sidebarBg = `color-mix(in srgb, ${ctx.accent} 10%, #ffffff)`;
  const sidebarBorder = `1.5px solid color-mix(in srgb, ${ctx.accent} 20%, transparent)`;

  return (
    <div
      ref={ref}
      style={{
        ...resumePageRootStyle(ctx),
        // Let the columns own their own padding; zero out the root's.
        padding: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: "33%",
          flexShrink: 0,
          background: sidebarBg,
          borderRight: sidebarBorder,
          padding: `${ctx.page.paddingY}px ${Math.round(ctx.page.paddingX * 0.75)}px`,
          boxSizing: "border-box",
        }}
      >
        {/* Header: name (slightly smaller) + contact stacked vertically */}
        <div style={{ ...resumeNameStyle(ctx), fontSize: ctx.preset.nameFont * 0.78, marginBottom: 8 }}>
          {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </div>
        <div style={{
          fontSize: ctx.preset.metaFont + 0.5,
          color: "#444",
          marginBottom: 14,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          wordBreak: "break-word",
        }}>
          {contactParts.map((c, i) => <span key={i}>{c}</span>)}
        </div>

        {/* Sidebar body sections */}
        {sidebarSlots.map((slot) => (
          <div key={slot}>{renderSectionSlot(slot, data, ctx)}</div>
        ))}
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
    </div>
  );
});

export default ResumePreview;
