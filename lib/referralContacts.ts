/**
 * Referral outreach tracker ("Find an insider").
 * Owner-only rows in `referral_contacts` (migration 021).
 */
import { getSupabaseClient } from "@/lib/supabase";

export const REFERRAL_STATUSES = [
  "to_contact",
  "contacted",
  "responded",
  "referred",
  "declined",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export type ReferralContact = {
  id: string;
  company: string;
  contactName: string;
  contactTitle: string | null;
  contactUrl: string | null;
  relationship: string;
  status: ReferralStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  responded: "Responded",
  referred: "Referred",
  declined: "Declined",
};

type ReferralRow = {
  id: string;
  company: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_url: string | null;
  relationship: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function isReferralStatus(value: string | null | undefined): value is ReferralStatus {
  return !!value && (REFERRAL_STATUSES as readonly string[]).includes(value);
}

export function mapReferralRow(row: ReferralRow): ReferralContact {
  return {
    id: row.id,
    company: row.company ?? "",
    contactName: row.contact_name ?? "",
    contactTitle: row.contact_title,
    contactUrl: row.contact_url,
    relationship: row.relationship ?? "other",
    status: isReferralStatus(row.status) ? row.status : "to_contact",
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function referralPipeline(contacts: ReferralContact[]): Record<ReferralStatus, number> {
  const counts: Record<ReferralStatus, number> = {
    to_contact: 0,
    contacted: 0,
    responded: 0,
    referred: 0,
    declined: 0,
  };
  for (const contact of contacts) counts[contact.status] += 1;
  return counts;
}

async function currentUserId(): Promise<string | null> {
  const db = getSupabaseClient();
  const { data: { session } } = await db.auth.getSession();
  return session?.user?.id ?? null;
}

export async function fetchReferralContacts(): Promise<ReferralContact[]> {
  try {
    const userId = await currentUserId();
    if (!userId) return [];
    const { data, error } = await getSupabaseClient()
      .from("referral_contacts")
      .select("id, company, contact_name, contact_title, contact_url, relationship, status, notes, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) {
      console.warn("[referral_contacts] fetch:", error.message);
      return [];
    }
    return ((data ?? []) as ReferralRow[]).map(mapReferralRow);
  } catch (err) {
    console.warn("[referral_contacts] fetch:", err);
    return [];
  }
}

export async function createReferralContact(input: {
  company: string;
  contactName: string;
  contactTitle?: string;
  contactUrl?: string;
}): Promise<ReferralContact | null> {
  const company = input.company.trim();
  const contactName = input.contactName.trim();
  if (!company || !contactName) return null;
  try {
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await getSupabaseClient()
      .from("referral_contacts")
      .insert({
        user_id: userId,
        company,
        contact_name: contactName,
        contact_title: input.contactTitle?.trim() || null,
        contact_url: input.contactUrl?.trim() || null,
        relationship: "other",
        source: "manual",
        status: "to_contact",
      })
      .select("id, company, contact_name, contact_title, contact_url, relationship, status, notes, created_at, updated_at")
      .single();
    if (error || !data) {
      console.warn("[referral_contacts] insert:", error?.message);
      return null;
    }
    return mapReferralRow(data as ReferralRow);
  } catch (err) {
    console.warn("[referral_contacts] insert:", err);
    return null;
  }
}

export async function updateReferralContactStatus(
  id: string,
  status: ReferralStatus,
): Promise<boolean> {
  try {
    const userId = await currentUserId();
    if (!userId) return false;
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "contacted") patch.contacted_at = new Date().toISOString();
    const { error } = await getSupabaseClient()
      .from("referral_contacts")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.warn("[referral_contacts] update:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[referral_contacts] update:", err);
    return false;
  }
}

export async function deleteReferralContact(id: string): Promise<boolean> {
  try {
    const userId = await currentUserId();
    if (!userId) return false;
    const { error } = await getSupabaseClient()
      .from("referral_contacts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.warn("[referral_contacts] delete:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[referral_contacts] delete:", err);
    return false;
  }
}
