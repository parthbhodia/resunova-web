import type { Metadata } from "next";
import ExtensionConnect from "@/components/ExtensionConnect";

/**
 * Deliberately not indexed: this page's only content is a one-time connection
 * code for the extension, and a search result for it would be a dead end.
 */
export const metadata: Metadata = {
  title: "Connect the Extension",
  robots: { index: false, follow: false },
};

export default function ExtensionConnectRoute() {
  return <ExtensionConnect />;
}
