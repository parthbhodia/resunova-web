import { RolePageData } from "@/lib/resumeExampleRoles/types";
import { RolePageHero } from "./RolePageHero";
import { MarketInsightsBlock } from "./MarketInsightsBlock";
import { ResumeExampleCard } from "./ResumeExampleCard";
import { WritingGuideSection } from "./WritingGuideSection";
import { FaqSection } from "./FaqSection";
import { RelatedRolesSection } from "./RelatedRolesSection";

export function RoleExamplePageTemplate({ data }: { data: RolePageData }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <RolePageHero data={data} />
      
      <main className="mx-auto max-w-6xl px-4 py-16 md:px-10 lg:px-16 xl:px-24">
        <MarketInsightsBlock insights={data.marketInsights} />
        
        <div id="examples" className="mb-20 pt-10 border-t border-slate-200">
          <h2 className="mb-10 text-3xl font-bold tracking-tight text-slate-900 text-center">
            {data.title} Resume Examples
          </h2>
          <div className="space-y-16">
            {data.examples.map((example) => (
              <ResumeExampleCard key={example.id} example={example} title={data.title} />
            ))}
          </div>
        </div>

        <div className="pt-16 border-t border-slate-200">
          <WritingGuideSection guide={data.writingGuide} title={data.title} />
        </div>

        <FaqSection faqs={data.writingGuide.faq} />
        <RelatedRolesSection roles={data.writingGuide.relatedRoles} />
      </main>
    </div>
  );
}
