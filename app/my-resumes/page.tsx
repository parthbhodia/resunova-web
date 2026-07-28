import type { Metadata } from "next";
import { MyResumesRedirect } from "./redirect-client";

export const metadata: Metadata = {
  title: "My Résumés",
  description: "Your résumés — scans, tailored versions, and drafts in one place.",
};

export default function MyResumesRoute() {
  return <MyResumesRedirect />;
}
