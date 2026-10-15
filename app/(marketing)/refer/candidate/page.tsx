import type { Metadata } from "next";
import { Suspense } from "react";
import ReferralCandidatePacket from "@/components/refer/ReferralCandidatePacket";

export const metadata: Metadata = {
  title: "Candidate referral profile",
  robots: { index: false, follow: false },
};

export default function ReferralCandidateRoute() {
  return (
    <Suspense fallback={<p>Loading candidate profile…</p>}>
      <ReferralCandidatePacket />
    </Suspense>
  );
}
