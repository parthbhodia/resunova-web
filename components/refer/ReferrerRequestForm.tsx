"use client";

import type { FormEvent } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AccentLink, OpenChip, ReferAlert, ReferField, ReferNote, ReferrerCard } from "@/components/refer/referUi";
import { filledButtonSx, mutedTextSx, outlineButtonSx, surfaceCardSx } from "@/components/mui/cssVars";
import { useSignInDialog } from "@/components/SignInDialog";
import { useUpgradeDialog } from "@/components/UpgradeDialog";
import {
  REFERRAL_ASK_BLOCKED_COPY,
  REFERRER_LIMITS,
  safeHttpUrl,
  type CompanyReferrer,
} from "@/lib/companyReferrers";
import { useReferralAsk } from "@/hooks/usePublicReferral";
import { FS, FW, LH } from "@/lib/typography";

export function ReferrerRequestForm({ referrer }: { referrer: CompanyReferrer }) {
  const { openSignIn } = useSignInDialog();
  const { openUpgrade } = useUpgradeDialog();
  const ask = useReferralAsk(referrer);
  const linkedinHref = safeHttpUrl(referrer.linkedin);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const outcome = await ask.submit();
    if (outcome === "sign_in") {
      openSignIn({
        title: "Sign in to ask for a referral",
        reason: "Your request is saved to your account so you can track it.",
      });
      return;
    }
    if (outcome === "upgrade") {
      openUpgrade({ source: "referral-ask" });
    }
  };

  // Renders the form disabled rather than hiding it: the user still sees what
  // they would be asking for and where it goes, which is what makes the upgrade
  // read as a choice instead of a dead end.
  const blocked = !ask.allowed && !ask.checkingPlan;

  return (
    <Stack spacing={2.5}>
      <AccentLink href="/refer/">Browse companies</AccentLink>
      <ReferrerCard name={referrer.displayName} count={referrer.referredCount ?? 0} avatarSize={56} badge={<OpenChip />}>
        <Typography sx={{ mt: 0.5, fontSize: FS.subhead, fontWeight: FW.semibold, color: "var(--text)" }}>
          Ask for a referral at {referrer.company}
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: FS.bodyLg, color: "var(--muted)", lineHeight: LH.normal }}>
          {referrer.title}{referrer.bio ? `. ${referrer.bio}` : ". They signed up to refer candidates at this company."}
        </Typography>
        {linkedinHref ? <AccentLink href={linkedinHref} external>LinkedIn</AccentLink> : null}
      </ReferrerCard>

      {ask.done ? (
        <Card elevation={0} sx={surfaceCardSx}>
          <Stack spacing={1} sx={{ p: 3 }}>
            <Typography component="h1" sx={{ m: 0, fontSize: FS.title, fontWeight: FW.bold, color: "var(--text)" }}>
              Request sent
            </Typography>
            <ReferNote>
              {referrer.displayName} will see this on their Referrals tab and can mark it referred if they submit you.
              Track it on your profile.
            </ReferNote>
            <AccentLink href="/profile?tab=referrals">View your requests</AccentLink>
          </Stack>
        </Card>
      ) : (
        <Card elevation={0} sx={surfaceCardSx}>
          <Stack component="form" spacing={1.5} onSubmit={(event) => void onSubmit(event)} sx={{ p: 3 }}>
            <Typography sx={{ ...mutedTextSx, fontSize: FS.small }}>
              We prefill from your Resunova profile when we can. Add a LinkedIn URL or a PDF résumé.
            </Typography>
            <ReferField label="Your name" placeholder="e.g. Jordan Lee" value={ask.form.name} maxLength={REFERRER_LIMITS.name} required onChange={(value) => ask.setField("name", value)} />
            <ReferField label="Your email" type="email" placeholder="you@example.com" value={ask.form.email} maxLength={REFERRER_LIMITS.email} required onChange={(value) => ask.setField("email", value)} />
            <ReferField label="Phone (optional)" type="tel" placeholder="e.g. +1 555 0100" value={ask.form.phone} maxLength={REFERRER_LIMITS.phone} onChange={(value) => ask.setField("phone", value)} />
            <ReferField label="Years of experience (optional)" type="number" placeholder="e.g. 5" value={ask.form.years} maxLength={2} onChange={(value) => ask.setField("years", value)} />
            <ReferField label="Headline (optional)" placeholder="e.g. Backend engineer, payments" value={ask.form.headline} maxLength={REFERRER_LIMITS.headline} onChange={(value) => ask.setField("headline", value)} />
            <ReferField label="Role you want" placeholder="e.g. Software Engineer" value={ask.form.role} maxLength={REFERRER_LIMITS.role} required onChange={(value) => ask.setField("role", value)} />
            <ReferField
              label="LinkedIn URL"
              placeholder="https://linkedin.com/in/your-name"
              value={ask.form.linkedin}
              maxLength={REFERRER_LIMITS.url}
              onChange={(value) => ask.setField("linkedin", value)}
            />
            <Stack spacing={0.75}>
              <Typography component="label" htmlFor="referral-resume-upload" sx={{ fontSize: FS.small, fontWeight: FW.semibold, color: "var(--text)" }}>
                Resume PDF
              </Typography>
              <input
                id="referral-resume-upload"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => ask.setResumeFile(event.target.files?.[0] ?? null)}
                style={{ fontSize: 14, color: "var(--muted)" }}
              />
              <Typography sx={{ ...mutedTextSx, fontSize: FS.small }}>
                {ask.form.resumeFile
                  ? `Selected: ${ask.form.resumeFile.name}`
                  : "PDF only, up to 5 MB. Required if you skip LinkedIn."}
              </Typography>
            </Stack>
            <ReferField
              label="Note to the referrer (optional)"
              placeholder="Why this role, and why this company"
              value={ask.form.notes}
              maxLength={REFERRER_LIMITS.notes}
              multiline
              onChange={(value) => ask.setField("notes", value)}
            />
            {ask.error ? <ReferAlert>{ask.error}</ReferAlert> : null}
            {blocked && !ask.error ? (
              <ReferAlert>{REFERRAL_ASK_BLOCKED_COPY[ask.entitlement?.reason ?? "upgrade"]}</ReferAlert>
            ) : null}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Button type="submit" variant="contained" disabled={ask.saving || !ask.allowed} sx={filledButtonSx}>
                {ask.checkingPlan ? "Checking your plan..." : ask.saving ? "Sending..." : "Ask for a referral"}
              </Button>
              {blocked ? (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => (ask.entitlement?.reason === "sign_in"
                    ? openSignIn({
                        title: "Sign in to ask for a referral",
                        reason: "Your request is saved to your account so you can track it.",
                      })
                    : openUpgrade({ source: "referral-ask" }))}
                  sx={{ ...outlineButtonSx, textTransform: "none" }}
                >
                  {ask.entitlement?.reason === "sign_in" ? "Sign in" : "See Pro"}
                </Button>
              ) : null}
            </Stack>
            <Typography sx={{ ...mutedTextSx, fontSize: FS.small }}>
              {referrer.displayName} will review your request. If they agree, they submit the referral through {referrer.company}&apos;s hiring process. Resunova does not submit it for them.
            </Typography>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
