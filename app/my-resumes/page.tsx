import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import MyResumes from "@/components/versions/MyResumes";

export const metadata: Metadata = {
  title: "My Résumés",
  description: "Your résumé versions — create, duplicate, and tailor them to a job without re-scanning.",
};

export default function MyResumesRoute() {
  return (
    <Suspense fallback={<MyResumesSkeleton />}>
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MyResumes />
        </div>
      </AppShell>
    </Suspense>
  );
}

function MyResumesSkeleton() {
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
      Loading your résumés…
    </div>
  );
}
