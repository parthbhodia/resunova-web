"use client";

/**
 * Title comparison, plus a way to change an Experience role's title.
 *
 * Title is not a queue row (rewriting a bullet to "be" the posting title is
 * the wrong fix). The comparison still lives here. The user can retitle a
 * real role themselves; aggressive mode can apply the posting's title on the
 * closest existing role in one click.
 */

import React, { useMemo, useState } from "react";
import type { RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import {
  defensibleRoleTitle,
  pickExperienceIndex,
  titlesEqual,
} from "@/lib/experienceTitle";
import { FS, FW } from "@/lib/typography";

export type ExperienceRoleOption = {
  index: number;
  role: string;
  company: string;
};

export function TailorTitleNote({
  ratings,
  roles,
  aggressive = false,
  onApplyRoleTitle,
}: {
  ratings: RatingsData;
  roles?: readonly ExperienceRoleOption[];
  aggressive?: boolean;
  onApplyRoleTitle?: (index: number, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const jt = isDetailedRatings(ratings) ? ratings.job_title : undefined;
  const jd = (jt?.jd_title ?? "").trim();
  const mine = (jt?.resume_title ?? "").trim();
  const list = roles ?? [];
  const canEdit = typeof onApplyRoleTitle === "function" && list.length > 0;

  const suggestedIndex = useMemo(() => {
    if (!list.length || !jd) return -1;
    return pickExperienceIndex(
      list.map((r) => ({ role: r.role, company: r.company })),
      { jdTitle: jd },
    );
  }, [jd, list]);

  if (!jt) return null;
  if (!jd && !mine) return null;

  const suggestedRole = suggestedIndex >= 0 ? list[suggestedIndex] : null;
  const oneClick =
    aggressive
    && suggestedRole
    && defensibleRoleTitle(suggestedRole.role, jd);

  const startEdit = (index: number, initial: string) => {
    setPicked(index);
    setDraft(initial);
    setEditing(true);
  };

  const applyDraft = () => {
    if (picked === null || !draft.trim() || !onApplyRoleTitle) return;
    onApplyRoleTitle(picked, draft.trim());
    setEditing(false);
  };

  return (
    <div
      data-testid="title-note"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "2px 2px 0",
        fontSize: FS.small,
        color: "var(--muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        {/* Not "Your title matches": that verb beside a low percentage read as
            a contradiction ("it does say Senior fullstack developer?"). The
            line states what is being compared, and the number names its unit so
            it can be checked against the two titles printed beside it. */}
        <span style={{ fontWeight: FW.semibold, color: "var(--text)" }}>
          Your title vs the posting&rsquo;s
        </span>
        {mine && jd ? (
          <span>
            {mine} vs {jd}
          </span>
        ) : null}
        <span style={{ fontWeight: FW.semibold, color: "var(--text)" }}>
          {Math.round(jt.score)}% overlap
        </span>
        {canEdit && !editing ? (
          <button
            type="button"
            data-testid="title-note-edit"
            onClick={() => startEdit(suggestedIndex >= 0 ? suggestedIndex : 0, jd || list[0]?.role || "")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
              fontWeight: FW.semibold,
              color: "var(--accent)",
            }}
          >
            Change a role title
          </button>
        ) : null}
      </div>

      {oneClick && suggestedRole && !editing ? (
        <div
          data-testid="title-note-aggressive"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--text)" }}>
            Aggressive: retitle {suggestedRole.role}
            {suggestedRole.company ? ` at ${suggestedRole.company}` : ""} to {jd}
          </span>
          <button
            type="button"
            data-testid="title-note-apply"
            onClick={() => onApplyRoleTitle?.(suggestedRole.index, jd)}
            style={{
              background: "var(--accent)",
              color: "var(--on-fill, #fff)",
              border: "none",
              borderRadius: 8,
              padding: "5px 12px",
              cursor: "pointer",
              font: "inherit",
              fontSize: FS.caption,
              fontWeight: FW.bold,
            }}
          >
            Use posting title
          </button>
        </div>
      ) : null}

      {editing && canEdit ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: FS.micro, fontWeight: FW.bold, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Role
            </span>
            <select
              value={picked ?? 0}
              onChange={(e) => {
                const i = Number(e.target.value);
                setPicked(i);
                const row = list.find((r) => r.index === i);
                if (row && (!draft.trim() || titlesEqual(draft, jd) || list.some((r) => titlesEqual(r.role, draft)))) {
                  setDraft(jd || row.role);
                }
              }}
              style={{
                font: "inherit",
                fontSize: FS.body,
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface, var(--bg))",
                color: "var(--text)",
              }}
            >
              {list.map((r) => (
                <option key={r.index} value={r.index}>
                  {[r.role, r.company].filter(Boolean).join(" · ") || `Role ${r.index + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: FS.micro, fontWeight: FW.bold, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              New title
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={jd || "e.g. Software Engineer"}
              style={{
                font: "inherit",
                fontSize: FS.body,
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid var(--accent)",
                background: "var(--surface, var(--bg))",
                color: "var(--text)",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {jd ? (
              <button
                type="button"
                onClick={() => setDraft(jd)}
                style={{
                  background: "none",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  borderRadius: 999,
                  padding: "5px 12px",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: FS.caption,
                  fontWeight: FW.semibold,
                }}
              >
                Match posting title
              </button>
            ) : null}
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={applyDraft}
              style={{
                background: "var(--accent)",
                color: "var(--on-fill, #fff)",
                border: "none",
                borderRadius: 999,
                padding: "5px 14px",
                cursor: draft.trim() ? "pointer" : "not-allowed",
                font: "inherit",
                fontSize: FS.caption,
                fontWeight: FW.bold,
                opacity: draft.trim() ? 1 : 0.6,
              }}
            >
              Apply title
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                font: "inherit",
                fontSize: FS.caption,
                fontWeight: FW.semibold,
                padding: "5px 4px",
              }}
            >
              Cancel
            </button>
          </div>
          <p style={{ margin: 0, fontSize: FS.caption, color: "var(--dim, var(--muted))", lineHeight: 1.5 }}>
            This changes the job title under Experience, not the headline at the
            top. Only use a title you held or can defend in an interview.
          </p>
        </div>
      ) : null}
    </div>
  );
}
