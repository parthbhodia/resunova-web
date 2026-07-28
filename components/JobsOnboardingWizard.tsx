"use client";

/**
 * JobsOnboardingWizard — in-place 3-step onboarding for a signed-in visitor who
 * lands on Jobs without a résumé. Replaces the cross-page jump to Analyze.
 *
 *   1. Role      → searchable dropdown (suggests real roles; the pick narrows by
 *                  job title via title_any, not just the coarse role_family).
 *   2. Location  → city/metro autocomplete (or Remote); a metro pick expands to
 *                  its alias group so "New York" matches NYC/Manhattan/Brooklyn.
 *   3. Résumé    → upload to rank matches, OR "skip — browse without ranking".
 *
 * Split layout (approved Direction 2): the question is on the left; a live
 * "X matching jobs" count (GET /api/jobs/count, debounced) on the right rewards
 * progress as the user answers. "Skip to results" is available from step 2 on.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SearchableSelect, { type SelectItem } from "@/components/SearchableSelect";
import {
  ROLE_SUGGESTIONS, US_METROS, NATIONWIDE_LOCATION, matchRoleSuggestions, matchMetros,
  browseSelectionToParams, type JobsBrowseSelection,
} from "@/lib/jobsTaxonomy";
import { apiFetch } from "@/lib/apiClient";

const SearchIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
const PinIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
);
const GlobeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
const UploadIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
);

/** Single shared loading spinner — one consistent loader treatment across the
 *  wizard (the live count and the résumé analysis) so they never compete. */
function Spinner({ size = 16, color = "var(--accent)" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block", width: size, height: size, flexShrink: 0,
        borderRadius: "50%", border: "2px solid var(--surface3, var(--surface2))",
        borderTopColor: color, animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

const H2: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 };
const SUB: React.CSSProperties = { fontSize: 13, color: "var(--muted)", margin: "8px 0 18px", lineHeight: 1.55 };
const SKIP: React.CSSProperties = { background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 };

export default function JobsOnboardingWizard({
  onBrowse,
  onResumeUploadStart,
  onPrefetch,
  initialStep = 1,
  initialRole = "",
  initialRoleTerms = null,
  initialLocation = "",
  initialMetroTerms = null,
  initialWorkModel = "",
  initialSeniority = "",
}: {
  /** Skip to unranked results for the chosen role + location. */
  onBrowse: (sel: JobsBrowseSelection) => void;
  /** User picked a résumé file. The parent takes over: it shows the (prefetched)
   *  feed immediately and runs analyze-upload in the background, then upgrades to
   *  the ranked feed in place. The wizard unmounts as soon as the feed shows. */
  onResumeUploadStart: (sel: JobsBrowseSelection, file: File) => void;
  /** Warm the feed for the in-progress selection while the user is still picking
   *  role/location, so it's instant on upload. Best-effort. */
  onPrefetch?: (sel: JobsBrowseSelection) => void;
  /** Seed the wizard when re-entered from an already-chosen role (e.g. the
   *  "Scan my résumé" CTA on the unranked feed) so it opens on the résumé step
   *  with role/location pre-filled instead of restarting at step 1. */
  initialStep?: 1 | 2 | 3 | 4;
  initialRole?: string;
  initialRoleTerms?: string[] | null;
  initialLocation?: string;
  initialMetroTerms?: string[] | null;
  initialWorkModel?: string;
  initialSeniority?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [role, setRole] = useState(initialRole);
  const [roleTerms, setRoleTerms] = useState<string[] | null>(initialRoleTerms);
  // US-only product → default the location to "United States" (a no-narrowing
  // sentinel) so it reads as pre-selected instead of an empty field.
  const [location, setLocation] = useState(initialLocation || NATIONWIDE_LOCATION);
  const [metroTerms, setMetroTerms] = useState<string[] | null>(initialMetroTerms);
  const [workModel, setWorkModel] = useState(initialWorkModel);
  const [seniority, setSeniority] = useState(initialSeniority);
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const selection = useMemo<JobsBrowseSelection>(() => ({
    role,
    titleTerms: roleTerms ?? [],
    location,
    locationTerms: metroTerms ?? [],
    workModel,
    seniority,
  }), [role, roleTerms, location, metroTerms, workModel, seniority]);

  // Live count, debounced on the chosen filters (only once a role is set).
  useEffect(() => {
    if (!role.trim()) { setCount(null); return; }
    let cancelled = false;
    setCountLoading(true);
    const t = setTimeout(async () => {
      try {
        const params = browseSelectionToParams(selection);
        params.set("max_age_days", "30");
        const resp = await apiFetch(`/api/jobs/count?${params.toString()}`);
        const data = await resp.json().catch(() => ({}));
        if (!cancelled) setCount(typeof data?.count === "number" ? data.count : null);
      } catch {
        if (!cancelled) setCount(null);
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [selection, role]);

  const roleItems: SelectItem[] = matchRoleSuggestions(role).map((r) => ({ key: r.label, label: r.label }));
  const metroItems: SelectItem[] = matchMetros(location).map((m) => ({
    key: m.label, label: m.label, sub: m.sub, icon: m.remote ? GlobeIcon : PinIcon,
  }));

  const pickRole = (item: SelectItem) => {
    const found = ROLE_SUGGESTIONS.find((r) => r.label === item.key);
    setRole(item.label);
    setRoleTerms(found ? found.titleTerms : null);
  };
  const pickMetro = (item: SelectItem) => {
    const found = US_METROS.find((m) => m.label === item.key);
    setLocation(item.label);
    setMetroTerms(found && !found.remote ? found.locationTerms : []);
    setWorkModel(found?.remote ? "remote" : "");
  };

  const countCaption = location.trim()
    ? `live ${role.trim() || "matching"} jobs · ${location.trim()}`
    : `live ${role.trim() || "matching"} jobs`;

  return (
    <Card>
      <CardContent style={{ padding: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
          {/* ── Left: the step ── */}
          <div style={{ flex: "2 1 360px", minWidth: 300, padding: "28px 28px 26px" }}>
            {/* Progress */}
            <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
              {[1, 2, 3, 4].map((s) => (
                <span key={s} style={{ width: 24, height: 4, borderRadius: 2, background: s <= step ? "var(--accent)" : "var(--surface2)", transition: "background 0.15s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", letterSpacing: "0.06em", marginBottom: 8 }}>
              STEP {step} OF 4
            </div>

            <div hidden={step !== 1}>
              <h2 style={H2}>Which role are you targeting?</h2>
              <p style={SUB}>Start typing: pick from real openings. We rank by job title, not just a broad category.</p>
              <SearchableSelect
                value={role}
                onChange={(v) => { setRole(v); setRoleTerms(null); }}
                onSelect={pickRole}
                items={roleItems}
                leadingIcon={SearchIcon}
                placeholder="e.g. Frontend Engineer, Data Scientist…"
                autoFocus={initialStep === 1}
                emptyHint="No preset match. We'll still search for that role."
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <Button disabled={!role.trim()} onClick={() => { onPrefetch?.(selection); setStep(2); }}>Continue →</Button>
              </div>
            </div>

            <div hidden={step !== 2}>
                <h2 style={H2}>Where do you want to work?</h2>
                <p style={SUB}>Pick a city, metro, or Remote. &ldquo;New York&rdquo; covers the whole NYC metro.</p>
                <SearchableSelect
                  value={location}
                  onChange={(v) => { setLocation(v); setMetroTerms(null); setWorkModel(""); }}
                  onSelect={pickMetro}
                  items={metroItems}
                  leadingIcon={PinIcon}
                  placeholder="City, metro, or Remote (optional)"
                  emptyHint="We'll match that text against posting locations."
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 24 }}>
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button type="button" onClick={() => onBrowse(selection)} style={SKIP}>Skip to results</button>
                    <Button onClick={() => { onPrefetch?.(selection); setStep(3); }}>Continue →</Button>
                  </div>
                </div>
            </div>

            <div hidden={step !== 3}>
                <h2 style={H2}>What experience level?</h2>
                <p style={SUB}>So we don&apos;t bury you under senior roles. Pick one, or skip and we&apos;ll infer it from your résumé.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { key: "", label: "Any level" },
                    { key: "entry", label: "Entry · new grad / intern" },
                    { key: "mid", label: "Mid" },
                    { key: "senior", label: "Senior" },
                    { key: "lead", label: "Lead / Director+" },
                  ].map((opt) => {
                    const active = seniority === opt.key;
                    return (
                      <button
                        key={opt.key || "any"}
                        type="button"
                        onClick={() => setSeniority(opt.key)}
                        style={{
                          padding: "9px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                          fontSize: 13, fontWeight: 600,
                          border: `1.5px solid ${active ? "var(--accent)" : "var(--border, var(--surface2))"}`,
                          background: active ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                          color: active ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 24 }}>
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button type="button" onClick={() => onBrowse(selection)} style={SKIP}>Skip to results</button>
                    <Button onClick={() => { onPrefetch?.(selection); setStep(4); }}>Continue →</Button>
                  </div>
                </div>
            </div>

            <div hidden={step !== 4}>
                <h2 style={H2}>Upload your résumé to rank matches</h2>
                <p style={SUB}>We&apos;ll score every opening against your résumé and sort the best fits first.</p>
                <input
                  ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onResumeUploadStart(selection, f); }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%", border: "1.5px dashed var(--accent)", background: "var(--accent-bg, color-mix(in srgb, var(--accent) 6%, transparent))",
                    borderRadius: 14, padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 6, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: "var(--accent)", display: "inline-flex" }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" /><path d="M12 13v8" /><path d="m16 17-4-4-4 4" /></svg>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Drag &amp; drop your résumé here</span>
                  <span style={{ fontSize: 11, color: "var(--dim)" }}>PDF · max 5 MB</span>
                </button>
                <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 4px" }}>
                  <Button onClick={() => fileRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ display: "inline-flex" }}>{UploadIcon}</span>
                    Choose résumé (PDF)
                  </Button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
                  <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                  <button type="button" onClick={() => onBrowse(selection)} style={SKIP}>
                    Skip: browse without ranking
                  </button>
                </div>
            </div>
          </div>

          {/* ── Right: live count + blurred teaser ── */}
          <div style={{ flex: "1 1 200px", minWidth: 200, borderLeft: "1px solid var(--border)", background: "var(--surface2, rgba(0,0,0,0.02))", padding: "28px 22px", display: "flex", flexDirection: "column" }}>
            {!role.trim() ? (
              <div style={{ margin: "auto 0", textAlign: "center", color: "var(--dim)", fontSize: 13, lineHeight: 1.5 }}>
                Pick a role to see live matches.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", lineHeight: 1, minHeight: 30, display: "flex", alignItems: "center" }}>
                  {count != null ? count.toLocaleString() : countLoading ? <Spinner size={22} /> : "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{countCaption}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18, filter: "blur(0.6px)", opacity: 0.82 }}>
                  {[{ t: "Software Engineer", c: "Google · New York, NY" }, { t: "Frontend Engineer", c: "Stripe · Remote (US)" }].map((j) => (
                    <div key={j.t} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{j.t}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{j.c}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 12 }}>preview · results unlock when you continue</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
