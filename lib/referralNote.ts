/**
 * The note an employee pastes into their own ATS or emails to a recruiter.
 *
 * Writing that paragraph is the tedious part of being a referrer, and it is the
 * part they most often skip, which is what turns a warm ask into a cold one. So
 * this assembles the facts the candidate already supplied and nothing else.
 *
 * Two rules govern what goes in:
 *
 * 1. No claim about the candidate that the candidate did not make themselves.
 *    The referrer's endorsement is a prompt, not a sentence. Only the referrer
 *    knows why they are vouching for someone, and a generated paragraph
 *    asserting it would put words in their mouth in front of their employer.
 * 2. A missing optional field is omitted, never printed as "Not provided". That
 *    string is right on the candidate packet, where the blank is information,
 *    and wrong in a note a human sends under their own name.
 */
import { packetYearsLabel, PACKET_NOT_PROVIDED } from "@/lib/referralEdgeCases";
import { safeHttpUrl, type CompanyReferralRequest } from "@/lib/companyReferrers";

export type ReferralNoteReferrer = {
  displayName: string;
  title: string;
  company: string;
};

/** Where the résumé lives, so the note never claims an attachment that is not there. */
export const REFERRAL_RESUME_HINT =
  "Their résumé PDF is on file. Ask me and I will send it over.";

function line(value: string | null | undefined, max = 200): string | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** "5 years", or null when the candidate left it blank. */
function yearsLine(years: number | null | undefined): string | null {
  if (years == null || !Number.isFinite(years)) return null;
  const label = packetYearsLabel(years);
  return label === PACKET_NOT_PROVIDED ? null : label;
}

/** Subject line for the ATS or the email. Falls back to something that still reads. */
export function referralNoteSubject(
  request: Pick<CompanyReferralRequest, "role">,
  referrer: ReferralNoteReferrer,
): string {
  const role = line(request.role, 120) ?? "an open role";
  const company = line(referrer.company, 80);
  return company ? `Referral for ${role} at ${company}` : `Referral for ${role}`;
}

/**
 * Plain text on purpose. This gets pasted into a textarea in someone else's
 * ATS, so it must survive a clipboard round trip and never depend on styling.
 */
export function buildReferralNote(
  request: CompanyReferralRequest,
  referrer: ReferralNoteReferrer,
): string {
  const candidate = line(request.candidateName, 80) ?? "This candidate";
  const role = line(request.role, 120) ?? "the role you are hiring for";
  const headline = line(request.candidateHeadline, 160);
  const email = line(request.candidateEmail, 120);
  const phone = line(request.candidatePhone, 40);
  const linkedin = safeHttpUrl(request.candidateLinkedin);
  const years = yearsLine(request.candidateYearsExperience);
  const theirWords = line(request.notes, 2000);

  const company = line(referrer.company, 80);
  const facts = [headline, years].filter(Boolean);
  const contact = [
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    linkedin ? `LinkedIn: ${linkedin}` : null,
  ].filter(Boolean);

  const blocks = [
    `Hi, I am referring ${candidate} for ${role}${company ? ` at ${company}` : ""}.`,
    facts.join("\n"),
    contact.join("\n"),
    request.resumePdfPath ? REFERRAL_RESUME_HINT : null,
    theirWords ? `In their own words:\n${theirWords}` : null,
    // The one line only the referrer can write.
    "Add your reason for vouching for them here, in your own words.",
    "Happy to answer any questions about their background.",
  ].filter((block): block is string => !!block);

  const signature = [
    line(referrer.displayName, 80),
    [line(referrer.title, 80), line(referrer.company, 80)].filter(Boolean).join(" at "),
  ]
    .filter(Boolean)
    .join("\n");

  return [...blocks, signature].join("\n\n");
}

/** Whether there is anything worth copying. A note that is only a signature is not. */
export function hasReferralNoteBody(
  request: CompanyReferralRequest,
): boolean {
  return !!(
    line(request.candidateName, 80)
    && line(request.role, 120)
    && (
      safeHttpUrl(request.candidateLinkedin)
      || line(request.candidateEmail, 120)
      || request.resumePdfPath
    )
  );
}

/** Clipboard write with a fallback for browsers that refuse the async API. */
export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export const REFERRAL_NOTE_COPY_FAILED = "Could not copy. Select the note and copy it manually.";