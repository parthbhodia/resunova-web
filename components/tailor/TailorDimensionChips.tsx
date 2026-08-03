"use client";

/**
 * Dimensions as three altitudes: a chip at a glance, a queue filter on click,
 * evidence on demand. This replaces the old pattern of a tabbed panel with its
 * own Fix buttons — a dimension is a VIEW of the one work queue, never a
 * second surface with duplicate actions.
 *
 * Clicking a chip filters the queue to that dimension AND opens its evidence
 * drawer: covered items with the resume line quoted, missing items pointing at
 * their queue row. Clicking again (or All) releases the filter.
 */

import React from "react";
import type { DetailedRatingItem, RatingsData } from "@/lib/types";
import { isDetailedRatings } from "@/lib/types";
import { type QueueKind, requirementText } from "@/lib/tailorWorkQueue";
import { FS, FW } from "@/lib/typography";

/** Queue-facing dimension: which row kinds a chip filters to. */
export type TailorDimension = "title" | "qualification" | "responsibility" | "keyword";

/** Row kinds each dimension shows. Title has no rows — informational only. */
export const DIMENSION_KINDS: Record<TailorDimension, readonly QueueKind[]> = {
  title: [],
  qualification: ["qualification"],
  responsibility: ["responsibility"],
  keyword: ["keyword", "contextual"],
};

/**
 * Quiet chips (mockup v7).
 *
 * The rail spends its loudest colour on the two score tiles above, so anything
 * under them has to read quieter or the panel has two competing focal points.
 *
 * The border comes off, but a resting fill goes on. A first pass dropped both
 * and the chips stopped reading as pressable at all — they looked like a row of
 * loose text. Quiet is not the same as invisible: the fill is what still says
 * "this is a control".
 */
function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: FS.body,
    fontWeight: FW.semibold,
    fontVariantNumeric: "tabular-nums",
    // Transparent rather than absent, so the box does not resize on press.
    border: "1px solid transparent",
    background: active ? "var(--accent-bg, rgba(9,105,218,0.11))" : "var(--surface-2, rgba(127,127,127,0.08))",
    color: active ? "var(--accent)" : "var(--text)",
    borderRadius: 999,
    padding: "7px 13px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

/**
 * The count colour carries whether the dimension still has work in it.
 *
 * Title is deliberately never warned even at 10%: it is informational and never
 * becomes a queue row, so colouring it red would point the user at something
 * this surface offers no way to act on.
 */
function countColor(active: boolean, incomplete: boolean): string {
  if (active) return "var(--accent)";
  return incomplete ? "var(--amber-ink, #b45309)" : "var(--muted)";
}

function EvRow({ have, text, quote }: { have: boolean; text: string; quote?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, padding: "5px 0", fontSize: FS.small }}>
      <span aria-hidden style={{ fontWeight: FW.extrabold, color: have ? "var(--green-ink, #16a34a)" : "var(--muted)" }}>
        {have ? "✓" : "✕"}
      </span>
      <div style={{ minWidth: 0 }}>
        {text}
        {quote ? (
          <div style={{ color: "var(--muted)", fontStyle: "italic", fontSize: FS.caption, marginTop: 1 }}>
            {quote}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function coveredQuote(it: DetailedRatingItem): string | undefined {
  if (!it.context?.trim()) return undefined;
  const n = it.locations && it.locations > 1 ? ` (${it.locations} places)` : "";
  return `"${it.context.trim()}"${n}`;
}

export function TailorDimensionChips({
  ratings,
  active,
  onPick,
}: {
  ratings: RatingsData;
  active: TailorDimension | null;
  /** null = All. A second click on the active chip also releases the filter. */
  onPick: (dim: TailorDimension | null) => void;
}) {
  if (!isDetailedRatings(ratings)) return null;
  const jt = ratings.job_title;
  const quals = ratings.qualifications;
  const resps = ratings.responsibilities;
  const kw = ratings.keywords;

  const have = (c: typeof quals) => c.covered.length + (c.resolved_by_user?.length ?? 0);
  const total = (c: typeof quals) => have(c) + c.missing.length;

  const chips: Array<{ dim: TailorDimension; label: string; count: string; incomplete: boolean }> = [
    // Title never carries the warn colour — see countColor.
    { dim: "title", label: "Title", count: `${Math.round(jt.score)}%`, incomplete: false },
    {
      dim: "qualification",
      label: "Qualifications",
      count: `${have(quals)}/${total(quals)}`,
      incomplete: have(quals) < total(quals),
    },
    {
      dim: "responsibility",
      label: "Responsibilities",
      count: `${have(resps)}/${total(resps)}`,
      incomplete: have(resps) < total(resps),
    },
    {
      dim: "keyword",
      label: "Keywords",
      count: `${kw.found_count}/${kw.total_count}`,
      incomplete: kw.found_count < kw.total_count,
    },
  ];

  const coveredOf = (c: typeof quals): DetailedRatingItem[] => [
    ...c.covered,
    ...(c.resolved_by_user ?? []),
  ];

  return (
    <div>
      <div role="group" aria-label="Match dimensions" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" style={chipStyle(active === null)} onClick={() => onPick(null)}>
          All
        </button>
        {chips.map((c) => (
          <button
            key={c.dim}
            type="button"
            aria-pressed={active === c.dim}
            style={chipStyle(active === c.dim)}
            onClick={() => onPick(active === c.dim ? null : c.dim)}
          >
            {c.label}{" "}
            <span style={{ color: countColor(active === c.dim, c.incomplete), fontWeight: FW.bold }}>
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div
          data-testid="dimension-evidence"
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--card)",
            padding: "10px 14px",
            marginTop: 8,
          }}
        >
          {active === "title" ? (
            <>
              <div style={{ fontSize: FS.small, fontWeight: FW.bold, marginBottom: 4 }}>
                Title match · {Math.round(jt.score)}%
              </div>
              <EvRow
                have={jt.matched}
                text={`The job is titled "${jt.jd_title}"; your resume says "${jt.resume_title}".`}
                quote="Renaming your headline is optional. Recruiters read your bullets; the ATS reads your keywords."
              />
            </>
          ) : active === "keyword" ? (
            <>
              <div style={{ fontSize: FS.small, fontWeight: FW.bold, marginBottom: 4 }}>
                Keywords · {kw.found_count} of {kw.total_count} on your resume
              </div>
              <EvRow
                have
                text={`${kw.found_count} already there`}
                quote="Highlighted quietly on the preview so you can see each one in place."
              />
              {(kw.direct_skills?.missing?.length ?? 0) + (kw.contextual?.missing?.length ?? 0) > 0 ? (
                <EvRow
                  have={false}
                  text={[...(kw.direct_skills?.missing ?? []), ...(kw.contextual?.missing ?? [])]
                    // Through requirementText, not join(): a keyword that came
                    // back as an object stringifies to "[object Object]" and
                    // that is what the user reads.
                    .map(requirementText)
                    .filter(Boolean)
                    .join(", ")}
                  quote="The open items below."
                />
              ) : null}
            </>
          ) : (
            (() => {
              const cat = active === "qualification" ? quals : resps;
              const name = active === "qualification" ? "Qualifications" : "Responsibilities";
              return (
                <>
                  <div style={{ fontSize: FS.small, fontWeight: FW.bold, marginBottom: 4 }}>
                    {name} · you have {have(cat)} of {total(cat)}
                  </div>
                  {coveredOf(cat).map((it, i) => (
                    <EvRow key={`c${i}`} have text={requirementText(it)} quote={coveredQuote(it)} />
                  ))}
                  {cat.missing.map((it, i) => (
                    <EvRow
                      key={`m${i}`}
                      have={false}
                      text={requirementText(it)}
                      quote="Not on your resume yet. Listed below."
                    />
                  ))}
                </>
              );
            })()
          )}
        </div>
      ) : null}
    </div>
  );
}
