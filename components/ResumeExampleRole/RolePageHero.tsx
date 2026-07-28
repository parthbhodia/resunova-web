import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, DollarSign, MapPin } from "lucide-react";
import { RolePageData } from "@/lib/resumeExampleRoles/types";

export function RolePageHero({ data }: { data: RolePageData }) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 md:px-10 lg:px-16 xl:px-24 border-b border-slate-200 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white" />
      
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-700/10 ring-inset">
          {data.category} Resumes
        </div>
        
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          {data.pageTitle.replace(data.title, "").trim() ? (
            <>
              {data.pageTitle.split(data.title)[0]}
              <span className="text-blue-600">{data.title}</span>
              {data.pageTitle.split(data.title)[1]}
            </>
          ) : (
            <span className="text-blue-600">{data.title}</span>
          )}
        </h1>
        
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl leading-relaxed">
          {data.metaDescription}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/?view=builder"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          >
            Build your {data.title} resume
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#examples"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            View examples
          </Link>
        </div>

        {/* Mini quick stats row below hero */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-slate-400" />
            {data.marketInsights.medianSalary}
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="size-4 text-slate-400" />
            {data.marketInsights.yearsExperience} avg.
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-slate-400" />
            {data.marketInsights.workStyle}
          </div>
        </div>
      </div>
    </section>
  );
}
