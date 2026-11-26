import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import PricingPlans from "@/components/PricingPlans";
import { FREE_SCAN_DAILY_LIMIT, PRO_SCAN_DAILY_LIMIT } from "@/components/UpgradeDialog";

// Display italic only, and only on this route, so the extra face is not paid
// for on any other page. Weight 400 is the only one used. Self-hosted from
// app/fonts so the build never asks Google for it.
const newsreader = localFont({
  src: "../../fonts/newsreader-latin-400-italic.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const PRICING_TITLE = "Pro Pricing | Resunova";
const PRICING_DESCRIPTION = `Resunova Pro raises the daily caps from ${FREE_SCAN_DAILY_LIMIT} résumé scans to ${PRO_SCAN_DAILY_LIMIT}, with ${PRO_SCAN_DAILY_LIMIT} job-match scores, tailored résumés and interview-prep runs a day. From $4.99 a week, cancel any time.`;

export const metadata: Metadata = {
  title: { absolute: PRICING_TITLE },
  description: PRICING_DESCRIPTION,
  openGraph: { title: PRICING_TITLE, description: PRICING_DESCRIPTION },
  twitter: { title: PRICING_TITLE, description: PRICING_DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div className="pr-page">
      {/* The blue field sizes to this section's own content, so the light
          copy inside it can never end up on the page background. */}
      <section className="pr-hero">
        <div className="pr-wrap">
          <div className="pr-body">
            <div>
              <p className="pr-eyebrow pr-rise">Resunova Pro</p>
              <h1 className={`pr-disp pr-rise ${newsreader.className}`} style={{ animationDelay: "60ms" }}>
                Tailor every application, not just the first three.
              </h1>
              <p className="pr-lede pr-rise" style={{ animationDelay: "110ms" }}>
                Free stops at {FREE_SCAN_DAILY_LIMIT} résumé scans a day. Pro raises every cap to{" "}
                {PRO_SCAN_DAILY_LIMIT}, so the day you find ten roles worth applying to is not the
                day you run out.
              </p>
            </div>
            <PricingPlans />
          </div>
        </div>
      </section>

      <div className="pr-after">
        <div>
          <aside className="pr-campus">
            <strong>Students at partner universities scan free.</strong>
            <p>
              If your school is a partner, the scan allowance is already included. Pro is for
              everyone else.
            </p>
          </aside>
          <div className="pr-faq">
            <h2>Questions</h2>
            <details>
              <summary>Is the free plan limited?</summary>
              <p>
                Yes. The free plan stays at {FREE_SCAN_DAILY_LIMIT} scans a day. Pro raises every cap
                to {PRO_SCAN_DAILY_LIMIT}.
              </p>
            </details>
            <details>
              <summary>Can I cancel mid-month?</summary>
              <p>
                Yes. Cancel any time from Account settings. You keep Pro until the end of the period
                you paid for.
              </p>
            </details>
          </div>
          <p className="pr-legal">
            Payments are processed securely by Stripe.{" "}
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
