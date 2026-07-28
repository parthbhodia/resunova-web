"use client";

/**
 * H-1B Sponsor Jobs board — the sponsor-wedge demand-test page (/jobs/sponsors).
 *
 * Public: anyone browses the sponsor-filtered feed (badge, wage, match score
 * when ranked). The PAID reveal layer is recruiter contacts on these postings:
 * the backend withholds them server-side for non-Pro callers and returns
 * `contactsLocked: true` — this component NEVER infers lockedness from an
 * empty list (empty just means "none found").
 *
 * Funnel events (once per posting per page view via OnceGuard, fire-and-forget):
 *   reveal_click → user opened the contacts section
 *   paywall_view → the locked card rendered for them
 *   checkout_start → they left for Stripe from here
 *   checkout_complete → they returned with ?checkout=success
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchJobDetail,
  trackJobEvent,
  type JobContact,
  type JobFeedItem,
} from "@/lib/jobsApi";
import { createCheckoutSession, PLAN_PRICE_LABELS, type BillingPriceKey } from "@/lib/billingApi";
import { OnceGuard, postedAgoLabel, sponsorBadgeLabel } from "@/lib/sponsorJobs";
import { apiFetch } from "@/lib/apiClient";

const CHECKOUT_POSTING_KEY = "rn_sponsor_checkout_posting";

type DetailState = {
  loading: boolean;
  error: string | null;
  jdText: string;
  url: string;
  contacts: JobContact[];
  contactsLocked: boolean;
};

export default function SponsorJobsBoard() {
  const [jobs, setJobs] = useState<JobFeedItem[] | null>(null);
  const [ranked, setRanked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  // Which plan's button is mid-redirect (null = idle). Per-plan so only the
  // clicked button shows a busy label while both stay disabled.
  const [checkoutBusy, setCheckoutBusy] = useState<BillingPriceKey | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const guard = useRef(new OnceGuard());

  // Load the sponsor-scoped feed (anon → browse; signed-in → ranked).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await apiFetch("/api/jobs/feed?sponsor=1&country=US");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (cancelled) return;
        setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
        setRanked(Boolean(data?.ranked));
        // Take the server's word for whether this request was authenticated.
        // Probing the client session separately can disagree with it — an
        // expired token reads as signed in locally while the server treats the
        // request as anonymous, which would show contacts instead of the
        // paywall.
        setSignedIn(Boolean(data?.signedIn));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Checkout return: fire checkout_complete for the posting that started it.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const state = params.get("checkout");
      if (!state) return;
      const postingId = sessionStorage.getItem(CHECKOUT_POSTING_KEY);
      sessionStorage.removeItem(CHECKOUT_POSTING_KEY);
      if (state === "success") {
        setCheckoutNotice("You're Pro now — contacts are unlocked below.");
        if (postingId) void trackJobEvent(postingId, "checkout_complete");
      } else if (state === "cancelled") {
        setCheckoutNotice("Checkout was cancelled — no charge was made. You can upgrade any time.");
      }
      params.delete("checkout");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    } catch {
      /* URL cleanup is cosmetic */
    }
  }, []);

  const openPosting = useCallback(async (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    if (details[id]) return; // already fetched
    if (guard.current.fire(`reveal:${id}`)) void trackJobEvent(id, "reveal_click");
    setDetails((d) => ({
      ...d,
      [id]: { loading: true, error: null, jdText: "", url: "", contacts: [], contactsLocked: false },
    }));
    try {
      const detail = await fetchJobDetail(id);
      setDetails((d) => ({
        ...d,
        [id]: {
          loading: false,
          error: null,
          jdText: detail.jdText || "",
          url: detail.url || "",
          contacts: detail.contacts || [],
          contactsLocked: Boolean(detail.contactsLocked),
        },
      }));
      if (detail.contactsLocked && guard.current.fire(`paywall:${id}`)) {
        void trackJobEvent(id, "paywall_view");
      }
    } catch (e) {
      setDetails((d) => ({
        ...d,
        [id]: {
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load posting",
          jdText: "",
          url: "",
          contacts: [],
          contactsLocked: false,
        },
      }));
    }
  }, [details]);

  const startCheckout = useCallback(async (postingId: string, priceKey: BillingPriceKey) => {
    if (checkoutBusy) return;
    setCheckoutBusy(priceKey);
    try {
      // One checkout_start per posting regardless of which plan they pick —
      // the funnel measures "reached checkout", not plan preference.
      if (guard.current.fire(`checkout:${postingId}`)) void trackJobEvent(postingId, "checkout_start");
      try {
        sessionStorage.setItem(CHECKOUT_POSTING_KEY, postingId);
      } catch {
        /* private mode — checkout_complete attribution is best-effort */
      }
      const result = await createCheckoutSession(priceKey);
      if ("url" in result) {
        window.location.href = result.url;
        return;
      }
      // Graceful fallback — /pricing carries the full plans + sign-in path.
      window.location.href = "/pricing/";
    } finally {
      setCheckoutBusy(null);
    }
  }, [checkoutBusy]);

  const asOf = useMemo(
    () => new Date().toLocaleDateString("en-US", { dateStyle: "long" }),
    [],
  );

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-rn-muted">
        The sponsor board couldn&apos;t load ({error}). Refresh to try again.
      </div>
    );
  }
  if (jobs === null) {
    return (
      <div className="grid gap-3" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-rn-muted">
        No sponsor-matched postings right now. The board refreshes daily — check back tomorrow,
        or <Link href="/jobs/" className="text-accent">browse all fresh jobs</Link>.
      </div>
    );
  }

  return (
    <div>
      {checkoutNotice && (
        <p role="status" className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text">
          {checkoutNotice}
        </p>
      )}
      <p className="mb-4 text-xs text-dim">
        Sponsor history from public DOL LCA filings, matched by employer · as of {asOf}.
        A badge means the employer has filed LCAs — always confirm sponsorship for the specific role.
      </p>
      <section aria-label="H-1B sponsor job openings" className="grid gap-3">
        {jobs.map((job) => {
          const d = details[job.id];
          const open = openId === job.id;
          return (
            <article key={job.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => void openPosting(job.id)}
                    className="text-left text-lg font-bold text-text hover:text-accent"
                    aria-expanded={open}
                  >
                    {job.title}
                  </button>
                  <p className="mt-1 text-sm font-semibold text-rn-muted">{job.company}</p>
                  <p className="mt-1 text-sm text-dim">
                    {[job.location, job.workModel, postedAgoLabel(job.postedAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* Employer-level fact only — and only when the row IS a
                      sponsor match (guards against an older API ignoring the
                      sponsor param and serving unfiltered rows). */}
                  {job.h1bSponsor && (
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                      {sponsorBadgeLabel(job.h1bCertifiedCount, job.h1bMedianWage)}
                    </span>
                  )}
                  {ranked && typeof job.matchScore === "number" && (
                    <span className="text-xs font-bold text-rn-muted">{job.matchScore} match</span>
                  )}
                </div>
              </div>

              {open && d && (
                <div className="mt-4 border-t border-border pt-4">
                  {d.loading && <p className="text-sm text-dim">Loading posting…</p>}
                  {d.error && <p className="text-sm text-rn-muted">Couldn&apos;t load this posting ({d.error}).</p>}
                  {!d.loading && !d.error && (
                    <>
                      {/* Contacts / reveal layer */}
                      {d.contactsLocked ? (
                        signedIn ? (
                          <div className="mb-4 rounded-lg border border-accent/40 bg-accent/5 p-4" data-testid="paywall-card">
                            <p className="text-sm font-bold text-text">Recruiter contact — Pro</p>
                            <p className="mt-1 text-sm text-rn-muted">
                              Unlock the hiring contact for this and every sponsor posting, where available.
                              Cancel anytime.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void startCheckout(job.id, "pro_monthly")}
                                disabled={checkoutBusy !== null}
                                data-testid="checkout-monthly"
                                className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                              >
                                {checkoutBusy === "pro_monthly"
                                  ? "Opening checkout…"
                                  : `${PLAN_PRICE_LABELS.pro_monthly.price}/mo`}
                              </button>
                              <button
                                type="button"
                                onClick={() => void startCheckout(job.id, "pro_quarterly")}
                                disabled={checkoutBusy !== null}
                                data-testid="checkout-quarterly"
                                className="rounded-lg border border-accent px-4 py-2 text-sm font-bold text-accent disabled:opacity-60"
                              >
                                {checkoutBusy === "pro_quarterly"
                                  ? "Opening checkout…"
                                  : `${PLAN_PRICE_LABELS.pro_quarterly.price}/3 mo`}
                              </button>
                              {PLAN_PRICE_LABELS.pro_quarterly.note && (
                                <span className="text-xs font-semibold text-accent">
                                  {PLAN_PRICE_LABELS.pro_quarterly.note}
                                </span>
                              )}
                            </div>
                            <Link href="/pricing/" className="mt-3 inline-block text-sm font-semibold text-accent">
                              See plans
                            </Link>
                          </div>
                        ) : (
                          <div className="mb-4 rounded-lg border border-border bg-surface p-4" data-testid="signin-card">
                            <p className="text-sm text-rn-muted">
                              <Link href="/" className="font-semibold text-accent">Sign in</Link>{" "}
                              to see recruiter contacts on sponsor postings.
                            </p>
                          </div>
                        )
                      ) : d.contacts.length > 0 ? (
                        <div className="mb-4 rounded-lg border border-border p-4" data-testid="contacts-card">
                          <p className="text-sm font-bold text-text">Hiring contact{d.contacts.length > 1 ? "s" : ""}</p>
                          {d.contacts.map((c) => (
                            <p key={c.email} className="mt-1 text-sm text-rn-muted">
                              {c.email}
                              {c.pocTitle ? ` · ${c.pocTitle}` : ""}
                              {c.source === "dol_lca" ? " · from the employer's DOL filing" : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      {/* JD stays public — the gate covers contacts only. */}
                      {d.jdText && (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-rn-muted">
                          {d.jdText.length > 2400 ? `${d.jdText.slice(0, 2400)}…` : d.jdText}
                        </p>
                      )}
                      {d.url && (
                        <p className="mt-3">
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent">
                            View full posting / apply on the company site →
                          </a>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
