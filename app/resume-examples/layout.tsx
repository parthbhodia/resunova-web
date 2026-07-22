import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professional Resume Examples & Templates | Resunova",
  description: "Browse 500+ professionally written resume examples across hundreds of careers. Get inspired and create an ATS-friendly resume in minutes.",
};

export default function ResumeExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
