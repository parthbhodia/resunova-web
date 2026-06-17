/**
 * Referral-contact ("Find an insider") API helpers.
 *
 * v1 is a user-owned outreach tracker: the user records people they're asking
 * for a referral at a company and moves each through To contact → Contacted →
 * Responded → Referred / Declined. There is no automatic insider discovery yet
 * (no authenticated connections graph — LinkedIn is scrape-only); that is
 * phase 2 and would arrive as rows with source='suggested'.
 *
 * Mirrors lib/jobsApi.ts: Supabase bearer auth, camelCase payloads.
 */
import { apiUrl } from "@/lib/utils";
import { authHeaders } from "@/lib/jobsApi";

export type ReferralStatus =
  | "to_contact"
  | "contacted"
  | "responded"
  | "referred"
  | "declined";

export type ReferralRelationship =
  | "alumni"
  | "colleague"
  | "recruiter"
  | "mutual"
  | "other";

export type ReferralContact = {
  id: string;
  postingId: string | null;
  company: string;
  contactName: string;
  contactTitle: string;
  contactUrl: string;
  relationship: ReferralRelationship;
  source: "manual" | "suggested";
  status: ReferralStatus;
  notes: string;
  contactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferralStats = Record<ReferralStatus, number> & { total: number };

export type ReferralListResponse = {
  referrals: ReferralContact[];
  stats: ReferralStats;
};

export type ReferralCreateInput = {
  contactName: string;
  postingId?: string | null;
  company?: string;
  contactTitle?: string;
  contactUrl?: string;
  relationship?: ReferralRelationship;
  status?: ReferralStatus;
  notes?: string;
};

export type ReferralPatchInput = Partial<
  Pick<
    ReferralContact,
    "status" | "relationship" | "contactName" | "contactTitle" | "contactUrl" | "company" | "notes"
  >
>;

async function parseError(resp: Response): Promise<never> {
  const body = await resp.json().catch(() => ({}));
  throw new Error(body?.message || body?.error || `HTTP ${resp.status}`);
}

/** List the caller's referral contacts. Pass postingId to scope to one job. */
export async function fetchReferrals(postingId?: string): Promise<ReferralListResponse> {
  const headers = await authHeaders();
  const qs = postingId ? `?postingId=${encodeURIComponent(postingId)}` : "";
  const resp = await fetch(apiUrl(`/api/referrals${qs}`), { headers });
  if (!resp.ok) return parseError(resp);
  return resp.json();
}

export async function createReferral(input: ReferralCreateInput): Promise<ReferralContact> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl("/api/referrals"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!resp.ok) return parseError(resp);
  return (await resp.json()).referral;
}

export async function updateReferral(id: string, patch: ReferralPatchInput): Promise<ReferralContact> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl(`/api/referrals/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!resp.ok) return parseError(resp);
  return (await resp.json()).referral;
}

export async function deleteReferral(id: string): Promise<void> {
  const headers = await authHeaders();
  const resp = await fetch(apiUrl(`/api/referrals/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers,
  });
  if (!resp.ok) return parseError(resp);
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  responded: "Responded",
  referred: "Referred",
  declined: "Declined",
};

export const REFERRAL_RELATIONSHIP_LABELS: Record<ReferralRelationship, string> = {
  alumni: "Alumni",
  colleague: "Former colleague",
  recruiter: "Recruiter",
  mutual: "Mutual connection",
  other: "Other",
};
