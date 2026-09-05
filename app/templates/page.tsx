import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import TemplateGallery from "@/components/TemplateGallery";

export const metadata: Metadata = {
  title: "Free ATS-Friendly Resume Templates",
  description:
    "Browse free ATS-friendly resume templates and open any of them in the builder with one click. No sign-up required.",
};

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesPageSkeleton />}>
      <AppShell>
        <TemplateGallery />
      </AppShell>
    </Suspense>
  );
}

function TemplatesPageSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0d1117)",
        color: "var(--muted, #94a3b8)",
      }}
    >
      Loading templates...
    </div>
  );
}
