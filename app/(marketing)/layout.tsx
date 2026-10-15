import type { ReactNode } from "react";
import { PublicSiteFrame } from "@/components/site/PublicSiteFrame";

/**
 * Free open marketing pages share one chrome owner. AuthGate still decides
 * whether the route is public; this layout only supplies header/footer.
 * Keep product shells, /r share viewer, and preview routes outside this group.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <PublicSiteFrame>{children}</PublicSiteFrame>;
}
