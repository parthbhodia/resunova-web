import type { GatePreviewCard } from "./GatePreview";
import { VIEW_LABELS, type AppView } from "@/components/app-shell/nav-config";

/**
 * What the gate says, per destination.
 *
 * The old gate said "Interview Prep needs a free account so your work is
 * saved to it." — which leads with OUR requirement. Every headline here leads
 * with what the visitor gets, because the page's job is to be worth
 * completing, not to explain a policy.
 *
 * ⚠️ `/account` deliberately has NO preview cards. A settings page has nothing
 * worth showing half-open, and inventing a panel to keep the layout
 * symmetrical would be decoration pretending to be information — so the gate
 * falls back to a single centred column there. That is Direction B's shape,
 * and the two compose rather than compete.
 */

export type GateContent = {
  /** The destination, named. Keeping the URL is half of not feeling bounced. */
  eyebrow: string;
  headline: string;
  lede: string;
  previewLabel?: string;
  previewCards?: GatePreviewCard[];
};

const GENERIC: GateContent = {
  eyebrow: "Resunova",
  headline: "Your work, saved and waiting when you come back.",
  lede: "An account keeps your scans, your tailored versions and your history in one place. Free, and it takes one click.",
};

const BY_PREFIX: Array<[string, GateContent]> = [
  [
    "/interview-prep",
    {
      eyebrow: "Interview Prep",
      headline: "Your prep, saved and waiting when you come back.",
      lede:
        "Questions built from your own résumé and the job you're chasing. Sign in and the set is yours to keep, edit and return to.",
      previewLabel: "What's behind this",
      previewCards: [
        {
          tag: "Behavioural",
          tone: "accent",
          text: "Tell me about a time you shipped something on a deadline you didn't set.",
          hint: "Each question comes with what the interviewer is actually testing.",
        },
        {
          tag: "From the posting",
          tone: "amber",
          text: "This role asks for Airflow. Walk me through a pipeline you've owned end to end.",
          // Future tense, deliberately: we have not read their résumé yet.
          hint: "Pulled from the job description you paste in, matched against your résumé.",
        },
        {
          tag: "Story bank",
          tone: "green",
          text: "A migration you ran, framed as Situation, Task, Action, Result.",
          hint: "Drafted from your own experience, then edited in your words.",
        },
        {
          tag: "Behavioural",
          tone: "accent",
          text: "Describe a disagreement with a senior engineer about an approach.",
        },
      ],
    },
  ],
  [
    "/my-resumes",
    {
      eyebrow: "My Résumés",
      headline: "Every version you've written, in one place.",
      lede:
        "Scan once, tailor per job, and keep each version with the score it earned. Sign in and nothing you write gets lost between sessions.",
      previewLabel: "What's behind this",
      previewCards: [
        {
          tag: "Scored 84",
          tone: "green",
          text: "Senior Data Engineer — base résumé",
          hint: "Every scan keeps its full report, so you can see what changed and why.",
        },
        {
          tag: "Tailored",
          tone: "accent",
          text: "Senior Data Engineer — Stripe, Payments Platform",
          hint: "A tailored copy per posting, each one tracked against its own job description.",
        },
        {
          tag: "Draft",
          tone: "amber",
          text: "Analytics Engineer — in progress",
          hint: "Edits save as you type. Re-scan when you're ready, not on every keystroke.",
        },
      ],
    },
  ],
  [
    "/profile",
    {
      // /profile left PUBLIC_ROUTES on main (#340): it is the signed-in hub, and
      // ProfilePage has no signed-out state. Before this entry it fell through
      // to the generic ask, so the gate did not say which page you were heading to.
      eyebrow: "Profile",
      headline: "Your plan, usage and referral activity in one place.",
      lede:
        "Sign in to see your plan and what you have left today, your referral requests and rewards, and the career details your tailored résumés start from.",
    },
  ],
  [
    "/account",
    {
      eyebrow: "Account",
      headline: "Your plan and your scan allowance, in one place.",
      lede:
        "Sign in to see which plan you're on, how many scans you have left today, and to manage billing.",
    },
  ],
];

/**
 * What the gate says for a `/?view=` the app can render but a signed-out visitor
 * may not open (cover letter today). Main's own prompt for this, #337, was a
 * third hand-rolled sign-in surface with its own copy and a `#fff` primary on
 * `--accent`; the gate and the dialog already share one form, so this is one
 * more destination for it rather than one more form.
 *
 * `library` and `account` are the same destinations as their routes, so they
 * reuse that copy instead of describing one place two ways. Anything else gets
 * the generic ask under the view's own name, which keeps the "you'll land back
 * on X" footer true.
 */
const BY_VIEW: Record<string, GateContent> = {
  "cover-letter": {
    eyebrow: "Cover letter",
    headline: "A cover letter drafted from your résumé and the posting.",
    lede:
      "Paste the job description and get a draft grounded in your own experience, then pick a layout, edit it and export. Sign in and each letter you write is saved.",
  },
};

export function gateContentForView(view: AppView): GateContent {
  const known = BY_VIEW[view];
  if (known) return known;
  if (view === "library") return gateContentFor("/my-resumes");
  if (view === "account") return gateContentFor("/account");
  return { ...GENERIC, eyebrow: VIEW_LABELS[view] };
}

export function gateContentFor(pathname: string | null): GateContent {
  if (!pathname) return GENERIC;
  const trimmed = pathname.replace(/\/$/, "");
  for (const [prefix, content] of BY_PREFIX) {
    if (trimmed === prefix || trimmed.startsWith(prefix + "/")) return content;
  }
  return GENERIC;
}
