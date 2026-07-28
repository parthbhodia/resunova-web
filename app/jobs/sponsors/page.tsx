import type { Metadata } from "next";
import Link from "next/link";
import { LogoFull } from "@/components/BrandLogo";
import { SITE_URL } from "@/lib/brand";
import SponsorJobsBoard from "@/components/SponsorJobsBoard";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "H-1B Sponsor Jobs, Live | Resunova",
  description:
    "Live job openings from employers with a real H-1B filing history (public DOL LCA data): LCA counts, median wages, and freshness. Browse free, start free.",
  alternates: { canonical: `${SITE_URL}/jobs/sponsors/` },
  robots: { index: true, follow: true },
};

export default function SponsorJobsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-text sm:px-8">
      <header className="mb-12 flex items-center justify-between border-b border-border pb-5">
        <Link href="/" aria-label="Resunova home"><LogoFull /></Link>
        <Link href="/jobs/" className="text-sm font-semibold text-accent">All fresh jobs</Link>
      </header>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">For visa-sponsored careers</p>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        H-1B sponsor jobs, live.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-rn-muted">
        Every posting below is from an employer with a real H-1B filing history in the public DOL
        LCA data: how many LCAs they&apos;ve filed and the median certified wage. Browse free.
        Sign in to rank them against your résumé; Pro unlocks recruiter contacts where available.
      </p>
      <div className="mt-10">
        <SponsorJobsBoard />
      </div>
    </main>
  );
}
