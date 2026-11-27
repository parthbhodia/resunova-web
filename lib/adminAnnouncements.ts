/**
 * The admin dashboard's side of announcements: the draft, its checks, and the
 * three calls to resunova-api (/api/admin/announcements).
 *
 * The checks here only exist so a mistake shows up before the request. The
 * server (and the database under it) decide again, and a server refusal is
 * shown field by field.
 */
import { apiFetch } from "@/lib/apiClient";
import { ANNOUNCEMENT_LIMITS, isInAppPath } from "@/lib/announcements";

export type AnnouncementStatus = "scheduled" | "live" | "ended";

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  status: AnnouncementStatus;
};

/** What the form holds. The two times are `datetime-local` values (the admin's own clock). */
export type Draft = {
  title: string;
  body: string;
  href: string;
  cta: string;
  startsAt: string;
  endsAt: string;
};

export type FieldErrors = Partial<Record<"title" | "body" | "href" | "cta" | "startsAt" | "endsAt", string>>;

export const EMPTY_DRAFT: Draft = { title: "", body: "", href: "", cta: "", startsAt: "", endsAt: "" };

/** Pages worth pointing an announcement at, so nobody types a path from memory. */
export const LINK_PRESETS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Jobs", href: "/?view=jobs" },
  { label: "Referrals", href: "/profile?tab=referrals" },
  { label: "Analyze", href: "/?view=analyze" },
  { label: "Profile", href: "/profile" },
];

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

/** Problems with a draft, by field. Empty means it can be sent. */
export function draftErrors(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  const title = collapse(draft.title);
  const body = collapse(draft.body);
  const cta = collapse(draft.cta);
  const href = draft.href.trim();
  if (!title) errors.title = "Add a title.";
  else if (title.length > ANNOUNCEMENT_LIMITS.title) errors.title = `Keep the title to ${ANNOUNCEMENT_LIMITS.title} characters.`;
  if (!body) errors.body = "Add the text people will read.";
  else if (body.length > ANNOUNCEMENT_LIMITS.body) errors.body = `Keep the text to ${ANNOUNCEMENT_LIMITS.body} characters.`;
  if (!href) errors.href = "Add a link.";
  else if (!isInAppPath(href)) {
    errors.href = "Use a page inside Resunova, like /?view=jobs. Full web addresses are not allowed.";
  }
  if (cta.length > ANNOUNCEMENT_LIMITS.cta) errors.cta = `Keep the button label to ${ANNOUNCEMENT_LIMITS.cta} characters.`;
  const start = draft.startsAt ? Date.parse(draft.startsAt) : NaN;
  const end = draft.endsAt ? Date.parse(draft.endsAt) : NaN;
  if (draft.endsAt && Number.isNaN(end)) errors.endsAt = "That end time is not a date.";
  else if (draft.endsAt && end <= Date.now()) errors.endsAt = "The end time is already in the past.";
  else if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) errors.endsAt = "The end time must be after the start.";
  return errors;
}

/** The request body. A blank time is left out: the server reads that as "now" / "no end". */
export function draftToPayload(draft: Draft) {
  const instant = (value: string) => {
    const ms = value ? Date.parse(value) : NaN;
    return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
  };
  return {
    title: collapse(draft.title),
    body: collapse(draft.body),
    href: draft.href.trim(),
    cta: collapse(draft.cta) || undefined,
    starts_at: instant(draft.startsAt),
    ends_at: instant(draft.endsAt),
  };
}

type ServerBody = { error?: string; message?: string; fields?: Record<string, string>; announcements?: AdminAnnouncement[]; announcement?: AdminAnnouncement };

async function readBody(resp: Response): Promise<ServerBody> {
  try {
    return (await resp.json()) as ServerBody;
  } catch {
    return {};
  }
}

function describeFailure(status: number, body: ServerBody): string {
  if (body.error === "not_set_up") {
    return "The announcements table is not set up yet. Apply migration 072 in Supabase, then try again.";
  }
  if (status === 401 || status === 403) return "Only admins can manage announcements. Sign in with an admin account.";
  if (body.error === "duplicate") return body.message ?? "This announcement is already live or scheduled.";
  return `Something went wrong (${status}). Try again.`;
}

export type ListResult = { ok: true; items: AdminAnnouncement[] } | { ok: false; message: string };

export async function listAnnouncements(): Promise<ListResult> {
  try {
    const resp = await apiFetch("/api/admin/announcements");
    const body = await readBody(resp);
    if (!resp.ok || !Array.isArray(body.announcements)) return { ok: false, message: describeFailure(resp.status, body) };
    return { ok: true, items: body.announcements };
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection and try again." };
  }
}

export type PublishResult =
  | { ok: true; announcement: AdminAnnouncement }
  | { ok: false; message: string; fields: FieldErrors };

/** Server field names are snake_case; the form's are camelCase. */
function fieldsFromServer(fields: Record<string, string> | undefined): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, message] of Object.entries(fields ?? {})) {
    if (key === "starts_at") out.startsAt = message;
    else if (key === "ends_at") out.endsAt = message;
    else if (key === "title" || key === "body" || key === "href" || key === "cta") out[key] = message;
  }
  return out;
}

export async function publishAnnouncement(draft: Draft): Promise<PublishResult> {
  try {
    const resp = await apiFetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftToPayload(draft)),
    });
    const body = await readBody(resp);
    if (resp.ok && body.announcement) return { ok: true, announcement: body.announcement };
    const fields = fieldsFromServer(body.fields);
    return {
      ok: false,
      fields,
      message: Object.keys(fields).length > 0 ? "Fix the highlighted fields and publish again." : describeFailure(resp.status, body),
    };
  } catch {
    return { ok: false, fields: {}, message: "Could not reach the server. Check your connection and try again." };
  }
}

export async function endAnnouncement(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const resp = await apiFetch(`/api/admin/announcements/${encodeURIComponent(id)}/end`, { method: "POST" });
    if (resp.ok) return { ok: true };
    return { ok: false, message: describeFailure(resp.status, await readBody(resp)) };
  } catch {
    return { ok: false, message: "Could not reach the server. Check your connection and try again." };
  }
}
