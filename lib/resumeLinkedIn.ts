/**
 * Whether a résumé already shows a LinkedIn profile.
 *
 * The structural check looks for linkedin.com. Headers often carry the same
 * profile as "LinkedIn/in/name", which is what the preview prints.
 */

const PROFILE_RE = /linkedin(?:\.com)?\/(?:in|pub)\/[a-z0-9_%-]{2,}/i;
const FIELD_RE = /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/|(?:\/)?in\/[a-z0-9_%-]{2,}/i;

export function resumeShowsLinkedInProfile(parts: {
  linkedin?: string | null;
  lines?: readonly string[] | null;
  extractedText?: string | null;
}): boolean {
  const field = (parts.linkedin ?? "").trim();
  if (field && (PROFILE_RE.test(field) || FIELD_RE.test(field))) return true;
  const blob = [...(parts.lines ?? []), parts.extractedText ?? ""].filter(Boolean).join("\n");
  return PROFILE_RE.test(blob);
}

export function isMissingLinkedInFlag(issue: string): boolean {
  return /\bno linkedin\b/i.test(issue);
}
