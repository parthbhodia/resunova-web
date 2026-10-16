/**
 * Extension page content, kept as data so the marketing page, the connect page
 * and any future store listing copy cannot drift apart.
 *
 * Honesty rules for this file (learned from the landing-page work):
 *   - No install counts, star ratings, or time-saved claims. Those become lies
 *     the day they are wrong, and they are the numbers a Web Store reviewer
 *     checks first.
 *   - Supported ATS is the list the extension actually has adapters for. Do not
 *     add a platform here without an adapter in `autoapply-extension/src/ats/`.
 *   - Never imply the extension submits an application. It does not, by design.
 */

export const CHROME_STORE_URL = process.env.NEXT_PUBLIC_CHROME_STORE_URL ?? "";

/** True once the store listing exists. The CTA degrades to a waitlist-free explainer until then. */
export const IS_STORE_LIVE = CHROME_STORE_URL.startsWith("https://");

export type AtsEntry = {
  id: string;
  name: string;
  /** Which board hosts the form. `boards.` prefixes matter for Greenhouse and Ashby. */
  hosts: string;
  /** What the adapter can fill today. Partial coverage is stated, not hidden. */
  coverage: string;
  /** Routes the extension watches for this platform. */
  match: string;
};

/** One entry per adapter in the extension's `src/ats/` registry. */
export const SUPPORTED_ATS: AtsEntry[] = [
  {
    id: "greenhouse",
    name: "Greenhouse",
    hosts: "boards.greenhouse.io",
    // Narrower than the adapter's own header comment implies. The adapter has
    // react-select FILLING logic but no react-select DISCOVERY, so nothing ever
    // routes to it, and there is no `country` canonical key at all. The Country
    // and EEO dropdowns are therefore left untouched. Do not widen this line
    // without adding discovery for it.
    coverage:
      "Full: first and last name, email, phone, and profile links. Country and EEO dropdowns are left for you",
    match: "*.greenhouse.io",
  },
  {
    id: "ashby",
    name: "Ashby",
    hosts: "jobs.ashbyhq.com",
    coverage: "Full: legal name, email, phone, and profile links",
    match: "jobs.ashbyhq.com",
  },
  {
    id: "lever",
    name: "Lever",
    hosts: "jobs.lever.co",
    coverage: "Full: name, contact, location, current company, links",
    match: "jobs.lever.co",
  },
  {
    id: "workday",
    name: "Workday",
    hosts: "*.myworkdayjobs.com",
    coverage:
      "Partial: fills the fields on the step you are on, never advances steps for you",
    match: "*.myworkdayjobs.com, *.myworkdaysite.com",
  },
];

export const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Upload your résumé once",
    body: "Resunova extracts your contact details, skills, work history and education into your Career Profile. Edit anything there and it stays the source of truth.",
  },
  {
    step: "2",
    title: "Connect the extension",
    body: "Open the connect page while signed in. The extension picks up a short-lived code and stores its own revocable session. Your Resunova password is never involved.",
  },
  {
    step: "3",
    title: "Open a job posting",
    body: "A small Autofill button appears on supported application forms. Click it and the extension reads your profile to build a fill plan.",
  },
  {
    step: "4",
    title: "Review, then fill",
    body: "Every field it intends to write is listed with its value. Untick anything, fill, and the page highlights exactly what changed.",
  },
];

export const CONTROL_POINTS = [
  {
    title: "You see every value before it lands",
    body: "The panel lists each field and the exact text it will write. Fields with no matching data are flagged instead of guessed.",
  },
  {
    title: "Submit stays yours",
    body: "The extension never clicks Submit and never advances a multi-step wizard. A filled form is a filled form.",
  },
  {
    title: "Undo is one click",
    body: "Every change is captured before it is written, so you can put the form back the way you found it.",
  },
];

export const PRIVACY_POINTS = [
  {
    title: "It runs on job application pages",
    body: "The fill logic is injected only on the four supported ATS domains, so it cannot read your email, banking, or anything else you have open.",
  },
  {
    title: "It reads your Resunova profile",
    body: "The fields it fills come from the profile on your account, fetched over an authenticated request. Your raw Supabase tokens are never handed to the extension.",
  },
  {
    title: "Nothing is shared or sold",
    body: "Your profile stays on your Resunova account. A recruiter sees your details only when you submit an application to them.",
  },
  {
    title: "Disconnect whenever you like",
    body: "The extension holds a revocable session you can kill from its popup. Disconnecting does not touch your Resunova account.",
  },
];

export const FAQ_ITEMS = [
  {
    q: "Does the extension submit applications for me?",
    a: "No. It fills the fields and highlights them. You review the form and click the site's own Submit button. That is a deliberate limit, not a missing feature.",
  },
  {
    q: "Which job sites are supported?",
    a: "Greenhouse, Ashby, Lever and Workday today. Coverage is partial by design: the extension fills the fields it can confidently identify and leaves the rest to you. More platforms ship as coverage is added.",
  },
  {
    q: "Why did Workday support only fill one step?",
    a: "Workday runs a multi-step wizard that validates each step before showing the next. Advancing steps for you means making decisions about your application, so the extension stops at the end of the step you are on.",
  },
  {
    q: "What happens to my data?",
    a: "It uses your saved Resunova profile to fill forms, and nothing else. Your data stays on your account, is never sold, and an employer sees it only when you submit an application to them.",
  },
  {
    q: "Do I need a Pro account?",
    a: "The extension works with any signed-in Resunova account. It reads your profile, so the more complete your profile is, the more it can fill.",
  },
  {
    q: "Why does it not work on LinkedIn or Indeed?",
    a: "Those flows are modal-heavy and change often, so matching fields reliably is harder than on the platforms listed above. They are not claimed as supported until they work.",
  },
];

export const REQUIREMENTS = [
  "Google Chrome, on desktop. Extensions do not run on mobile browsers.",
  "A free Resunova account, signed in on this device.",
  "A Career Profile with at least a name and email. Everything else is optional and fills in as you add it.",
];
