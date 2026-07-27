"use client";
import { forwardRef, type CSSProperties } from "react";
import type { TBResumeData } from "./types";
import { parseCustomSectionId } from "./types";
import { renderSectionSlot } from "./renderResumeSections";
import type { CanvasEdit } from "./canvas/canvasTypes";
import {
  resolveResumeLayout,
  resumeNameStyle,
  resumePageRootStyle,
} from "@/lib/resumeLayout";

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

const ResumePreview = forwardRef<HTMLDivElement, { data: TBResumeData; edit?: CanvasEdit }>(function ResumePreview({ data, edit }, ref) {
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

  const renderContactRowWithIcons = (color = "#555", isDark = false) => {
    const iconStyle = { marginRight: 4, flexShrink: 0, opacity: isDark ? 0.8 : 0.6, marginTop: 1 };
    const itemStyle = { display: "flex", alignItems: "center", color };
    
    return (
      <div style={{
        fontSize: ctx.preset.metaFont,
        color,
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 14px",
      }}>
        {profile.phone && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            {profile.phone}
          </div>
        )}
        {profile.email && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            {profile.email}
          </div>
        )}
        {profile.location && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {profile.location}
          </div>
        )}
        {profile.linkedin && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            {profile.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
          </div>
        )}
        {profile.website && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
          </div>
        )}
        {profile.github && (
          <div style={itemStyle}>
            <svg style={iconStyle} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            {profile.github.replace(/^https?:\/\/(www\.)?/, '')}
          </div>
        )}
      </div>
    );
  };

  // ── Single-column layout (default) ─────────────────────────────────────────
  if (layout === "single") {
    return (
      <div ref={ref} style={resumePageRootStyle(ctx)}>
        <div style={resumeNameStyle(ctx)}>
          {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
        </div>
        {renderContactRowWithIcons(ctx.preset.accentColor)}

        {sectionOrder.map((slot) => {
          if (hidden.has(slot)) return null;
          return <div key={slot}>{renderSectionSlot(slot, data, ctx, edit)}</div>;
        })}
      </div>
    );
  }

  // ── Setup for all multi-column layouts ──────────────────────────────────────
  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));
  const sidebarSlots = visibleSlots.filter(isSidebarSlot);
  const mainSlots    = visibleSlots.filter((s) => !isSidebarSlot(s));

  // Initials badge for creative layouts
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    return "??";
  };

  // ── Two-column layout (Left Sidebar) ────────────────────────────────────────
  if (layout === "twoColumn") {
    const sidebarBg = `color-mix(in srgb, ${ctx.accent} 10%, #ffffff)`;
    const sidebarBorder = `1.5px solid color-mix(in srgb, ${ctx.accent} 20%, transparent)`;

    return (
      <div
        ref={ref}
        style={{
          ...resumePageRootStyle(ctx),
          padding: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
        }}
      >
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
          <div style={{ ...resumeNameStyle(ctx), fontSize: ctx.preset.nameFont * 0.78, marginBottom: 8 }}>
            {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
          </div>
          <div style={{ marginBottom: 14 }}>
            {renderContactRowWithIcons("#444")}
          </div>
          {sidebarSlots.map((slot) => (
            <div key={slot}>{renderSectionSlot(slot, data, ctx, edit)}</div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: `${ctx.page.paddingY}px ${ctx.page.paddingX}px`,
            boxSizing: "border-box",
          }}
        >
          {mainSlots.map((slot) => (
            <div key={slot}>{renderSectionSlot(slot, data, ctx, edit)}</div>
          ))}
          {mainSlots.length === 0 && (
            <p style={{ color: "#bbb", fontSize: 13, marginTop: 24 }}>
              Summary, Experience, and Projects appear here.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Right Sidebar Layout (Elise / Teal) ──────────────────────────────
  if (layout === "rightSidebar") {
    // Inject the inverse text variable into the context for the sidebar
    const sidebarCtx = { ...ctx };
    const cssVars = {
      "--az-resume-text-color": "var(--resume-paper-inverse-text)",
      "--resume-paper-dim": "var(--resume-paper-inverse-muted)",
    } as CSSProperties;

    return (
      <div
        ref={ref}
        style={{
          ...resumePageRootStyle(ctx),
          padding: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
        }}
      >
        {/* Main Left Column */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: `${ctx.page.paddingY}px ${ctx.page.paddingX}px`,
            boxSizing: "border-box",
          }}
        >
          <div style={{ ...resumeNameStyle(ctx), marginBottom: 4 }}>
            {profile.name || <span style={{ color: "#bbb" }}>Your Name</span>}
          </div>
          {/* Subtitle / Role could go here if we had it, fallback to email/location inline */}
          <div style={{ marginBottom: 20 }}>
            {renderContactRowWithIcons(ctx.accent)}
          </div>
          {mainSlots.map((slot) => (
            <div key={slot}>{renderSectionSlot(slot, data, ctx, edit)}</div>
          ))}
        </div>

        {/* Dark Right Sidebar */}
        <div
          className="az-dark-sidebar"
          style={{
            width: "35%",
            flexShrink: 0,
            background: ctx.accent,
            color: "#ffffff",
            padding: `${ctx.page.paddingY}px ${Math.round(ctx.page.paddingX * 0.75)}px`,
            boxSizing: "border-box",
            ...cssVars
          }}
        >
          {/* Initials Badge */}
          <div className="az-sidebar-initials" style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 700,
            color: ctx.accent,
            margin: "12px auto 36px auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            {getInitials(profile.name || "Your Name")}
          </div>

          <style>{`
            .az-dark-sidebar *:not(.az-sidebar-initials) {
              color: inherit !important;
              border-color: rgba(255, 255, 255, 0.4) !important;
            }
            .az-dark-sidebar .az-resume-bullet::before {
              color: rgba(255, 255, 255, 0.8) !important;
            }
          `}</style>
          
          {sidebarSlots.map((slot) => (
            <div key={slot}>{renderSectionSlot(slot, data, sidebarCtx, edit)}</div>
          ))}
        </div>
      </div>
    );
  }

  // ── Top Banner + Right Sidebar (Harper / Blue Banner) ───────────────
  if (layout === "topBannerRightSidebar") {
    const sidebarCtx = { ...ctx };
    return (
      <div
        ref={ref}
        style={{
          ...resumePageRootStyle(ctx),
          padding: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Banner */}
        <div style={{
          background: ctx.accent,
          color: "#ffffff",
          padding: `${Math.max(ctx.page.paddingY, 48)}px ${ctx.page.paddingX}px`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ ...resumeNameStyle(ctx), color: "#ffffff", marginBottom: 6 }}>
              {profile.name || <span style={{ color: "rgba(255,255,255,0.7)" }}>Your Name</span>}
            </div>
            {/* If we had a role, it would go here. We'll put a placeholder or summary start */}
            <div style={{ fontSize: ctx.preset.metaFont + 1, fontWeight: 600, marginBottom: 12 }}>
              {profile.summary ? profile.summary.split(".")[0] + "." : "Professional Title"}
            </div>
            <div style={{ marginBottom: 12 }}>
              {renderContactRowWithIcons("rgba(255,255,255,0.9)", true)}
            </div>
          </div>
          {/* Avatar / Initials */}
          <div style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${ctx.accent} 70%, #000000)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 700,
            flexShrink: 0,
            marginLeft: 32,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)"
          }}>
            {getInitials(profile.name || "Your Name")}
          </div>
        </div>

        {/* 2-Column Body */}
        <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
          {/* Main Left Column */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${ctx.page.paddingY}px ${ctx.page.paddingX}px`,
              boxSizing: "border-box",
            }}
          >
            {/* Since summary is usually in the banner partially, we still render main slots here */}
            {mainSlots.map((slot) => (
              <div key={slot}>{renderSectionSlot(slot, data, ctx, edit)}</div>
            ))}
          </div>

          {/* Right Sidebar (Light) */}
          <div
            style={{
              width: "35%",
              flexShrink: 0,
              padding: `${ctx.page.paddingY}px ${Math.round(ctx.page.paddingX * 0.75)}px`,
              boxSizing: "border-box",
              borderLeft: "1px solid var(--resume-paper-border)"
            }}
          >
            {sidebarSlots.map((slot) => (
              <div key={slot}>{renderSectionSlot(slot, data, sidebarCtx, edit)}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
});

export default ResumePreview;
