"use client";

/**
 * State for the referral route. It stays in a hook, not a store:
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
  approxYearsFromExperience,
  createReferralRequest,
  fetchReferrerBySlug,
  filterOpenCompanies,
  listOpenReferrersForCompany,
  listOpenReferralCompanies,
  slugifyPart,
  uploadReferralResume,
  type CompanyReferrer,
  type OpenReferralCompany,
} from "@/lib/companyReferrers";
import { fetchFeaturedCompanies } from "@/lib/jobsApi";
import { fetchExtractedProfile, fetchUserProfile, getSupabaseClient } from "@/lib/supabase";

export type ReferralAskForm = {
  name: string;
  email: string;
  phone: string;
  years: string;
  headline: string;
  linkedin: string;
  role: string;
  notes: string;
  resumeFile: File | null;
};

const EMPTY_ASK: ReferralAskForm = {
  name: "",
  email: "",
  phone: "",
  years: "",
  headline: "",
  linkedin: "",
  role: "",
  notes: "",
  resumeFile: null,
};

export type ReferrerLookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; referrer: CompanyReferrer };

/**
 * Session for the /refer gate. Unsigned visitors must not learn who is open
 * to refer; the directory and share-link payload load only after sign-in.
 */
export function useReferSession(): { status: "loading" | "signed_out" | "signed_in" } {
  const [status, setStatus] = useState<"loading" | "signed_out" | "signed_in">("loading");

  useEffect(() => {
    let cancelled = false;
    const client = getSupabaseClient();
    client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session?.user ? "signed_in" : "signed_out");
    }).catch(() => {
      if (!cancelled) setStatus("signed_out");
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setStatus(session?.user ? "signed_in" : "signed_out");
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { status };
}

export function useReferrerLookup(slug: string, enabled = true): ReferrerLookup {
  const [result, setResult] = useState<{ slug: string; lookup: ReferrerLookup }>({
    slug: slug && enabled ? slug : "",
    lookup: slug && enabled ? { status: "loading" } : { status: "idle" },
  });

  useEffect(() => {
    if (!slug || !enabled) return;
    let cancelled = false;
    fetchReferrerBySlug(slug).then((result) => {
      if (cancelled) return;
      if (!result.ok) setResult({ slug, lookup: { status: "error", message: result.error } });
      else if (!result.data) setResult({ slug, lookup: { status: "missing" } });
      else setResult({ slug, lookup: { status: "ready", referrer: result.data } });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, enabled]);

  if (!slug || !enabled) return { status: "idle" };
  return result.slug === slug ? result.lookup : { status: "loading" };
}

export type OpenCompaniesDirectory = {
  query: string;
  setQuery: (value: string) => void;
  status: "loading" | "empty" | "error" | "ready";
  companies: OpenReferralCompany[];
  filtered: OpenReferralCompany[];
  error: string | null;
};

/** Load open companies once; search filters the grid client-side (no people list). */
export function useOpenReferralCompanies(enabled = true): OpenCompaniesDirectory {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OpenCompaniesDirectory["status"]>(enabled ? "loading" : "empty");
  const [companies, setCompanies] = useState<OpenReferralCompany[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      let domainsBySlug: Record<string, string> = {};
      try {
        const featured = await fetchFeaturedCompanies();
        for (const row of featured) {
          const slug = slugifyPart(row.company);
          if (slug && row.domain) domainsBySlug[slug] = row.domain;
        }
      } catch {
        domainsBySlug = {};
      }
      const result = await listOpenReferralCompanies(domainsBySlug);
      if (cancelled) return;
      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        setCompanies([]);
        return;
      }
      setCompanies(result.data);
      setError(null);
      setStatus(result.data.length === 0 ? "empty" : "ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const filtered = filterOpenCompanies(companies, query);
  const viewStatus: OpenCompaniesDirectory["status"] =
    status === "ready" && filtered.length === 0 && query.trim().length > 0
      ? "empty"
      : status;

  return {
    query,
    setQuery,
    status: enabled ? viewStatus : "empty",
    companies: enabled ? companies : [],
    filtered: enabled && status === "ready" ? filtered : [],
    error: enabled ? error : null,
  };
}

export type CompanyReferrerDirectory = {
  status: "idle" | "loading" | "empty" | "error" | "ready";
  referrers: CompanyReferrer[];
  error: string | null;
};

/** Load the people behind a selected company tile. */
export function useCompanyOpenReferrers(companySlug: string | null): CompanyReferrerDirectory {
  const [result, setResult] = useState<CompanyReferrerDirectory & { companySlug: string }>({
    companySlug: "",
    status: "idle",
    referrers: [],
    error: null,
  });

  useEffect(() => {
    if (!companySlug) return;
    let cancelled = false;
    listOpenReferrersForCompany(companySlug).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setResult({ companySlug, status: "error", referrers: [], error: response.error });
        return;
      }
      setResult({
        companySlug,
        status: response.data.length ? "ready" : "empty",
        referrers: response.data,
        error: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  if (!companySlug) return { status: "idle", referrers: [], error: null };
  return result.companySlug === companySlug
    ? result
    : { status: "loading", referrers: [], error: null };
}

export type AskReferralOutcome = "sent" | "sign_in" | "error";

export function useReferralAsk(referrer: CompanyReferrer) {
  const [form, setForm] = useState<ReferralAskForm>(EMPTY_ASK);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        if (cancelled || !data.session?.user) return;
        const user = data.session.user;
        const metadata = user.user_metadata ?? {};
        const suggestedName = String(metadata.full_name ?? metadata.name ?? "").trim();
        const [profile, extracted] = await Promise.all([fetchUserProfile(), fetchExtractedProfile()]);
        if (cancelled) return;
        const years = approxYearsFromExperience(extracted?.experience);
        setForm((previous) => ({
          ...previous,
          name: previous.name || extracted?.name || profile?.displayName || suggestedName,
          email: previous.email || user.email || extracted?.email || profile?.email || "",
          phone: previous.phone || extracted?.phone || profile?.phone || "",
          years: previous.years || (years != null ? String(years) : ""),
          headline: previous.headline || extracted?.headline || extracted?.role || profile?.headline || "",
          linkedin: previous.linkedin || extracted?.linkedin || profile?.linkedin || "",
          role: previous.role || extracted?.role || profile?.roles?.split(",")[0]?.trim() || "",
        }));
      } catch {
        // The submit path reports session errors. Prefill is best-effort only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key: Exclude<keyof ReferralAskForm, "resumeFile">, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setResumeFile = (file: File | null) => {
    setForm((prev) => ({ ...prev, resumeFile: file }));
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
    if (!form.linkedin.trim() && !form.resumeFile) {
      setSaving(false);
      setError("Could not send this request. Add a LinkedIn URL or upload your resume.");
      return "error";
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
    let resumePdfPath: string | null = null;
    if (form.resumeFile) {
      const uploaded = await uploadReferralResume(form.resumeFile);
      if (!uploaded.path) {
        setSaving(false);
        setError(uploaded.error);
        return "error";
      }
      resumePdfPath = uploaded.path;
    }
    const { request, error: writeError } = await createReferralRequest({
      referrerId: referrer.id,
      candidateName: form.name,
      candidateEmail: form.email,
      candidateLinkedin: form.linkedin,
      resumePdfPath,
      candidatePhone: form.phone,
      candidateYearsExperience: form.years,
      candidateHeadline: form.headline,
      role: form.role,
      notes: form.notes,
      source: "request",
    });
    setSaving(false);
    if (!request) {
      setError(
        writeError
          ?? "Could not send this request. Add your name, a valid email, the role you want, and a LinkedIn URL or resume PDF.",
      );
      return "error";
    }
    setDone(true);
    return "sent";
  };

  return { form, setField, setResumeFile, saving, done, error, submit };
}
