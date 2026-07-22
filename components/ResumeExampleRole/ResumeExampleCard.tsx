"use client";

import { ResumeExample } from "@/lib/resumeExampleRoles/types";
import ResumePreview from "@/components/TemplateBuilder/ResumePreview";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";
import { useRouter } from "next/navigation";

export function ResumeExampleCard({ example, title }: { example: ResumeExample; title: string }) {
  const router = useRouter();

  const handleUseTemplate = () => {
    stashTemplateBuilderExactPrefill(example.resumeData);
    router.push("/?view=builder");
  };

  return (
    <div className="group mb-16 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      {/* Left side: Resume Preview Thumbnail */}
      <div className="w-full lg:w-[400px] shrink-0 flex justify-center">
        <div className="w-full max-w-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition-shadow hover:shadow-lg">
          <div className="relative w-full overflow-hidden bg-slate-50" style={{ height: 500 }}>
            <div
              className="pointer-events-none select-none absolute left-1/2 top-0"
              style={{
                transform: "translateX(-50%) scale(0.48)",
                transformOrigin: "top center",
                width: 816, // Natural width of the resume
              }}
            >
              <ResumePreview data={example.resumeData} />
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-4">
            <button
              onClick={handleUseTemplate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Use this template
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right side: Critique and Meta */}
      <div className="flex-1 pt-2">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          <CheckCircle2 className="size-4 text-emerald-500" />
          ATS-Friendly Template
        </div>
        
        <h3 className="mb-4 text-2xl font-bold text-slate-900">
          {example.headline} Example
        </h3>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-lg leading-relaxed text-slate-600">
            {example.critique}
          </p>
        </div>

        <div className="mt-8 rounded-xl bg-blue-50/50 p-6 border border-blue-100">
          <h4 className="font-semibold text-slate-900 mb-3">Key takeaways for this level:</h4>
          <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
            <li>Tailored specifically for {title} roles at the {example.headline} level</li>
            <li>Prioritizes measurable impact over just listing responsibilities</li>
            <li>Optimized keyword distribution for ATS systems</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
