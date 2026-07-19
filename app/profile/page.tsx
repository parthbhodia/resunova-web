import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import ProfilePage from "@/components/profile/ProfilePage";

export const metadata: Metadata = {
  title: "Career Profile",
  description: "Your AI-powered career profile — upload a résumé to auto-fill it, then edit and track completion.",
};

export default function ProfileRoute() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ProfilePage />
        </div>
      </AppShell>
    </Suspense>
  );
}

function ProfilePageSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontSize: 14,
      }}
    >
      Loading profile…
    </div>
  );
}
