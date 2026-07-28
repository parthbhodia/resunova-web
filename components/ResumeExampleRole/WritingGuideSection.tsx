import { RolePageData } from "@/lib/resumeExampleRoles/types";
import { CheckCircle2, XCircle, Lightbulb, MessageSquare } from "lucide-react";

export function WritingGuideSection({ guide, title }: { guide: RolePageData["writingGuide"], title: string }) {
  return (
    <div className="mb-20">
      <div className="mb-12 max-w-3xl">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900">How to write a great {title} resume</h2>
        <p className="text-lg text-slate-600 leading-relaxed">{guide.intro}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Tips & Bullet Guidance */}
        <div className="lg:col-span-1 space-y-8">
          <div className="rounded-2xl bg-blue-50/50 p-6 border border-blue-100">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4">
              <Lightbulb className="size-5 text-amber-500" />
              Pro Tips
            </h3>
            <ul className="space-y-4">
              {guide.tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200">
            <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4">
              <MessageSquare className="size-5 text-blue-500" />
              Expert Insight
            </h3>
            <blockquote className="text-sm italic text-slate-600 border-l-4 border-blue-300 pl-4 py-1">
              "{guide.expertQuote}"
            </blockquote>
          </div>
        </div>

        {/* Right Column: Examples (Headlines & Summaries) */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Headlines */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Headline Examples</h3>
            <div className="space-y-6">
              {guide.headlineExamples.map((ex, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="p-5 bg-emerald-50/30">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 className="size-4" /> Strong
                      </div>
                      <p className="font-medium text-slate-900">{ex.strong}</p>
                    </div>
                    <div className="p-5 bg-rose-50/30">
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                        <XCircle className="size-4" /> Weak
                      </div>
                      <p className="font-medium text-slate-500 line-through decoration-rose-300">{ex.weak}</p>
                    </div>
                  </div>
                  {ex.explanation && (
                    <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
                      <strong className="text-slate-900">Why it works:</strong> {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Summaries */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Summary Examples</h3>
            <div className="space-y-6">
              {guide.summaryExamples.map((ex, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="p-5 bg-emerald-50/30">
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 className="size-4" /> Strong
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{ex.strong}</p>
                    </div>
                    <div className="p-5 bg-rose-50/30">
                      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-rose-700">
                        <XCircle className="size-4" /> Weak
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">{ex.weak}</p>
                    </div>
                  </div>
                  {ex.explanation && (
                    <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
                      <strong className="text-slate-900">Why it works:</strong> {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
