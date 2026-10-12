"use client";

/**
 * State for the public referral route. It stays in a hook, not a store:
 * nothing outside /refer reads it, and it should die with the page.
 * Shared app state (the scan, the suggestion list) still lives in store/.
 *
 * Reads and writes go through lib/companyReferrers.ts. This file decides
 * what the screen should show.
 */

import { useEffect, useState } from "react";
import {
  REFERRER_LINK_INACTIVE,
  REFERRER_SESSION_FAILED,
  createReferralRequest,
  fetchReferrerBySlug,
  searchOpenReferrers,
  type CompanyReferrer,
  type LoadResult,
} from "@/lib/companyReferrers";
import { getSupabaseClient } from "@/lib/supabase";

const SEARCH_DEBOUNCE_MS = 250;

export type ReferralAskForm = {
  name: string;
  email: string;
  linkedin: string;
  role: string;
  notes: string;
};

const EMPTY_ASK: ReferralAskForm = { name: "", email: "", linkedin: "", role: "", notes: "" };

export type ReferrerLookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; referrer: CompanyReferrer };

export function useReferrerLookup(slug: string): ReferrerLookup {
  const [lookup, setLookup] = useState<ReferrerLookup>(slug ? { status: "loading" } : { status: "idle" });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetchReferrerBySlug(slug).then((result) => {
      if (cancelled) return;
      if (!result.ok) setLookup({ status: "error", message: result.error });
      else if (!result.data) setLookup({ status: "missing" });
      else setLookup({ status: "ready", referrer: result.data });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return lookup;
}

export type ReferrerSearch = {
  query: string;
  setQuery: (value: string) => void;
  status: "idle" | "loading" | "empty" | "error" | "results";
  results: CompanyReferrer[];
  error: string | null;
};

export function useReferrerSearch(): ReferrerSearch {
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<{ q: string; result: LoadResult<CompanyReferrer[]> } | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchOpenReferrers(q).then((result) => {
        if (!cancelled) setFetched({ q, result });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();
  const settled = q.length >= 2 && fetched?.q === q ? fetched.result : null;
  let status: ReferrerSearch["status"] = "idle";
  if (q.length >= 2 && !settled) status = "loading";
  else if (settled && !settled.ok) status = "error";
  else if (settled && settled.data.length === 0) status = "empty";
  else if (settled) status = "results";

  return {
    query,
    setQuery,
    status,
    results: settled && settled.ok ? settled.data : [],
    error: settled && !settled.ok ? settled.error : null,
  };
}

export type AskReferralOutcome = "sent" | "sign_in" | "error";

export function useReferralAsk(referrer: CompanyReferrer) {
  const [form, setForm] = useState<ReferralAskForm>(EMPTY_ASK);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (key: keyof ReferralAskForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (): Promise<AskReferralOutcome> => {
    setSaving(true);
    setError(null);
    let signedIn = false;
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      signedIn = !!session?.user;
    } catch {
      setSaving(false);
      setError(REFERRER_SESSION_FAILED);
      return "error";
    }
    if (!signedIn) {
      setSaving(false);
      return "sign_in";
    }
    const stillOpen = await fetchReferrerBySlug(referrer.slug);
    if (!stillOpen.ok) {
      setSaving(false);
      setError(stillOpen.error);
      return "error";
    }
    if (!stillOpen.data) {
      setSaving(false);
      setError(REFERRER_LINK_INACTIVE);
      return "error";
    }
    const { request, error: writeError } = await createReferralRequest({
      referrerId: referrer.id,
      candidateName: form.name,
      candidateEmail: form.email,
      candidateLinkedin: form.linkedin,
      role: form.role,
      notes: form.notes,
      source: "request",
    });
    setSaving(false);
    if (!request) {
      setError(writeError ?? "Could not send this request. Add your name, a valid email, and the role you want.");
      return "error";
    }
    setDone(true);
    return "sent";
  };

  return { form, setField, saving, done, error, submit };
}
