import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { LogoFull } from "@/components/BrandLogo";
import PricingPlans from "@/components/PricingPlans";
import { FREE_SCAN_DAILY_LIMIT, PRO_SCAN_DAILY_LIMIT } from "@/components/UpgradeDialog";

// Display italic only, and only on this route, so the extra face is not paid
// for on any other page. Weight 400 is the only one used.
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400"], style: ["italic"], display: "swap" });

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Resunova Pro raises the daily caps from 3 résumé scans to 30, with 30 job-match scores, tailored résumés and interview-prep runs a day. $19 a month, cancel any time.",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div className="pr-page">
      {/* The blue field sizes to this section's own content, so the light
          copy inside it can never end up on the page background. */}
      <section className="pr-hero">
        <div className="pr-wrap">
          <header className="pr-head">
            <Link href="/" style={{ textDecoration: "none" }}>
              <LogoFull markSize={26} textColor="#ffffff" />
            </Link>
            <Link href="/" className="pr-back">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to home
            </Link>
          </header>

          <div className="pr-body">
            <div>
              <p className="pr-eyebrow pr-rise">Resunova Pro</p>
              <h1 className="pr-disp pr-rise" style={{ animationDelay: "60ms" }}>
                Tailor every application,{" "}
                <em className={newsreader.className}>not just the first three.</em>
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
        <p className="pr-legal">
          Payments are processed securely by Stripe. Cancel any time from Account settings and you
          keep Pro until the end of the period you paid for. Students at partner universities scan
          free. The free plan stays available at {FREE_SCAN_DAILY_LIMIT} scans a day.{" "}
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </p>
      </div>
    </div>
  );
}
