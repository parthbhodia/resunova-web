import type { Metadata } from "next";
import ReferPublicPage from "@/components/refer/ReferPublicPage";
import { SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ask an employee for a referral",
  description: "Find employees who have signed up to refer candidates at their company, or open a private referral link.",
  alternates: { canonical: `${SITE_URL}/refer/` },
  robots: { index: true, follow: true },
};

export default function ReferRoute() {
  return <ReferPublicPage />;
}
