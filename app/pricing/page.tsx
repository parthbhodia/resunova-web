import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import PricingPlans from "@/components/PricingPlans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Resunova pricing: free daily résumé scans, job matching, and interview prep — or go Pro for unlimited ATS checks, AI fixes, and tailored résumés.",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 56, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <LogoFull markSize={26} textColor="var(--text)" />
        </Link>
        <Link href="/" style={{
          fontSize: "var(--font-size-base)", color: "var(--dim)", textDecoration: "none",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px 80px" }}>
        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14, textAlign: "center" }}>
          Pricing
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, lineHeight: 1.12, margin: "0 0 16px", textAlign: "center" }}>
          Start free. Go unlimited when you&apos;re ready.
        </h1>
        <p style={{ fontSize: "var(--font-size-lg)", color: "var(--muted)", lineHeight: 1.75, margin: "0 auto 44px", maxWidth: 560, textAlign: "center" }}>
          Every account gets free daily résumé scans, the full job feed, application
          tracking, and interview prep. Pro removes the daily caps.
        </p>

        <PricingPlans />

        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--dim)", lineHeight: 1.7, margin: "40px auto 0", maxWidth: 560, textAlign: "center" }}>
          Payments are processed securely by Stripe. Cancel anytime from Account
          settings — you keep Pro until the end of the period you paid for.
          Students at partner universities get unlimited scans free.
        </p>
      </main>
    </div>
  );
}
