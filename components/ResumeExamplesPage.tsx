"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Zap, Code, Briefcase, Target, BarChart,
  Megaphone, DollarSign, Users, TrendingUp, Headphones,
  Palette, Heart, GraduationCap, CheckCircle2, ChevronDown,
  Star, FileText, Shield, MessageSquare, Lightbulb, ArrowRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LogoFull } from "./BrandLogo";
import ResumePreview from "@/components/TemplateBuilder/ResumePreview";
import type { TBResumeData } from "@/components/TemplateBuilder/types";
import { RESUME_EXAMPLES_DATA } from "./ResumeExamplesData";
import { stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";
import { productManagerData } from "@/lib/resumeExampleRoles/product-manager";
import { softwareEngineerData } from "@/lib/resumeExampleRoles/software-engineer";
import { salesData } from "@/lib/resumeExampleRoles/sales";
import { projectManagerData } from "@/lib/resumeExampleRoles/project-manager";
import { dataScienceData } from "@/lib/resumeExampleRoles/data-science";
import { marketingData } from "@/lib/resumeExampleRoles/marketing";
import { financeData } from "@/lib/resumeExampleRoles/finance";
import { humanResourcesData } from "@/lib/resumeExampleRoles/human-resources";
import { customerSupportData } from "@/lib/resumeExampleRoles/customer-support";
import { graphicDesignData } from "@/lib/resumeExampleRoles/graphic-design";
import { healthcareData } from "@/lib/resumeExampleRoles/healthcare";
import { educationData } from "@/lib/resumeExampleRoles/education";
import type { RolePageData } from "@/lib/resumeExampleRoles/types";

// ── The A4-ish natural render width (same as TemplateBuilderClient) ──────────
const PREVIEW_NATURAL_WIDTH = 816; // 8.5in @ 96dpi

const CARD_PRESETS = RESUME_EXAMPLES_DATA;

// ── Registry of all role pages — add new roles here ──────────────────────────
const ROLE_PAGES: RolePageData[] = [
  productManagerData,
  softwareEngineerData,
  salesData,
  projectManagerData,
  dataScienceData,
  marketingData,
  financeData,
  humanResourcesData,
  customerSupportData,
  graphicDesignData,
  healthcareData,
  educationData,
];

function ResumeCardThumbnail({
  data
}: {
  data: TBResumeData;
}) {
  return <ResumePreview data={data} />;
}

export default function ResumeExamplesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md md:px-10 lg:px-16 xl:px-24">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <LogoFull markSize={24} textColor="#0f172a" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/resume-examples" className="text-blue-600">Resume Examples</Link>
          <Link href="/?view=builder" className="hover:text-slate-900">Resume Builder</Link>
          <Link href="/template-builder" className="hover:text-slate-900">Templates</Link>
          <Link href="#" className="hover:text-slate-900">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/?view=analyze" className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden font-medium text-slate-600 hover:text-slate-900 sm:inline-flex" })}>
            Sign In
          </Link>
          <Link href="/?view=analyze" className={buttonVariants({ size: "sm", className: "bg-blue-600 font-semibold text-white hover:bg-blue-700" })}>
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 text-center sm:py-28 md:px-10 lg:px-16 xl:px-24">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            <Zap className="size-4" />
            500+ Professional Resume Examples
          </div>
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Find the Perfect <span className="text-blue-600">Resume Example</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Browse professionally written resume examples across hundreds of careers. Get inspired and create an ATS-friendly resume in minutes.
          </p>

          <div className="mx-auto mb-8 max-w-2xl">
            <div className="flex items-center h-16 shadow-lg shadow-blue-900/5 rounded-full border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all p-2">
              <div className="flex items-center justify-center pl-4 pr-3">
                <Search className="size-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by job title (e.g., Software Engineer, Product Manager, Data Analyst)"
                className="flex-1 h-full bg-transparent text-base outline-none placeholder:text-slate-400 min-w-0"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveCategory("All");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    document.getElementById('resume-grid')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
              <button 
                onClick={() => document.getElementById('resume-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="h-full rounded-full bg-blue-600 px-8 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Search
              </button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Software Engineer", "Product Manager", "Data Analyst", "UX Designer"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setSearchQuery(chip);
                    setActiveCategory("All");
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-slate-500 sm:gap-x-12">
            <div className="flex items-center gap-2"><strong className="text-lg text-slate-900">500+</strong> Resume Examples</div>
            <div className="flex items-center gap-2"><strong className="text-lg text-slate-900">60+</strong> Industries Covered</div>
            <div className="flex items-center gap-2"><strong className="text-lg text-slate-900">97%</strong> ATS Pass Rate</div>
          </div>
        </div>
      </section>

      {/* ── Popular Career Categories ────────────────────────────────────── */}
      <section className="mx-auto w-full px-4 py-16 md:px-10 lg:px-16 xl:px-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 text-xs font-bold tracking-wider text-blue-600 uppercase">Browse by Career</div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Popular Career Categories</h2>
          </div>
          <Link href="#" className="hidden items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 sm:flex">
            View all categories <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {[
            { icon: Code, color: "text-blue-600", bg: "bg-blue-50", title: "Software Engineering" },
            { icon: Target, color: "text-indigo-600", bg: "bg-indigo-50", title: "Product Management" },
            { icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50", title: "Sales" },
            { icon: Briefcase, color: "text-purple-600", bg: "bg-purple-50", title: "Project Management" },
            { icon: BarChart, color: "text-cyan-600", bg: "bg-cyan-50", title: "Data Science" },
            { icon: Megaphone, color: "text-pink-600", bg: "bg-pink-50", title: "Marketing" },
            { icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", title: "Finance" },
            { icon: Users, color: "text-orange-600", bg: "bg-orange-50", title: "Human Resources" },
            { icon: Headphones, color: "text-blue-500", bg: "bg-blue-50", title: "Customer Support" },
            { icon: Palette, color: "text-fuchsia-600", bg: "bg-fuchsia-50", title: "Graphic Design" },
            { icon: Heart, color: "text-red-500", bg: "bg-red-50", title: "Healthcare" },
            { icon: GraduationCap, color: "text-teal-600", bg: "bg-teal-50", title: "Education" },
          ].map((cat) => {
            const count = CARD_PRESETS.filter(r => r.category === cat.title).length;
            return (
            <button
              key={cat.title}
              onClick={() => {
                setActiveCategory(cat.title);
                setSearchQuery("");
                document.getElementById('resume-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group rounded-[20px] border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 text-left"
            >
              <div className={`mb-6 flex size-12 items-center justify-center rounded-full ${cat.bg} ${cat.color}`}>
                <cat.icon className="size-5" />
              </div>
              <h3 className="mb-1 font-semibold text-slate-900 group-hover:text-blue-600">{cat.title}</h3>
              <p className="text-sm text-slate-500">{count} examples</p>
            </button>
            );
          })}
        </div>
      </section>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 border-y border-slate-200 bg-white/90 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full items-center gap-4 overflow-x-auto px-4 pb-1 md:px-10 lg:px-16 xl:px-24 [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-xs font-bold tracking-wider text-slate-400 uppercase">Filter:</span>
          {["All", "ATS Friendly", "Entry Level", "Mid Level", "Senior", "Internship", "Remote", "Executive"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter}
            </button>
          ))}
          <button className="shrink-0 rounded-full border border-slate-200 bg-white px-5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 flex items-center gap-1">
            More filters <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Role Pages Grid ───────────────────────────────────────────────── */}
      <section id="resume-grid" className="mx-auto w-full px-4 py-16 md:px-10 lg:px-16 xl:px-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className="mb-2 text-xs font-bold tracking-wider text-blue-600 uppercase">Curated Role Guides</div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Browse by Job Title
            </h2>
            <p className="mt-2 text-slate-500">Select a role to see real resume examples, expert tips, and market insights.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ROLE_PAGES.map((role) => {
            const THUMB_H = 280;
            const scale = 0.38;
            // Use the first example's resume data as the preview
            const previewData = role.examples[0]?.resumeData;
            return (
              <Link
                key={role.slug}
                href={`/resume-examples/${role.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-blue-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Live Resume Preview Thumbnail */}
                <div
                  className="relative w-full overflow-hidden bg-slate-50"
                  style={{ height: THUMB_H }}
                >
                  {/* Badges */}
                  <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-sm">
                      <CheckCircle2 className="size-3" /> ATS Friendly
                    </div>
                    <div className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                      {role.examples.length} Examples
                    </div>
                  </div>

                  {previewData && (
                    <div
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        width: PREVIEW_NATURAL_WIDTH,
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      <ResumePreview data={previewData} />
                    </div>
                  )}

                  {/* Bottom fade */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>

                {/* Card Details */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{role.title}</h3>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {role.category}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-slate-500">{role.marketInsights.medianSalary} · {role.marketInsights.yearsExperience}</p>
                  <div className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-blue-700">
                    View {role.examples.length} Examples <ArrowRight className="size-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured Resume ───────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-16 text-white sm:py-24">
        <div className="mx-auto w-full px-4 md:px-10 lg:px-16 xl:px-24">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-xs font-bold tracking-wider text-blue-400 uppercase">Editor's Pick</div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Featured Resume</h2>
            </div>
            <div className="flex w-fit items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-semibold text-amber-400 border border-amber-500/30">
              <Star className="size-4 fill-amber-400" /> Top Rated
            </div>
          </div>

          <div className="flex flex-col gap-8 rounded-3xl bg-slate-800 p-6 sm:p-10 lg:flex-row lg:items-center">
            <div className="flex-1 lg:pr-10">
              <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl">Strategic Product Manager</h3>
              <p className="mb-6 text-lg text-slate-300">
                A masterclass in framing achievements. This resume perfectly balances strategic vision with tactical execution metrics. It uses our &ldquo;Executive Modern&rdquo; template which parses flawlessly in Workday and Greenhouse.
              </p>
              <div className="mb-8 flex flex-wrap gap-2">
                {["Leadership", "Go-To-Market", "Data Analysis", "Agile"].map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-700 px-3 py-1 text-sm text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
              <Link href="/template-builder/?preset=executive" className={buttonVariants({ className: "h-12 w-full sm:w-auto rounded-full bg-blue-600 px-8 text-base font-semibold text-white hover:bg-blue-500" })}>
                Use This Template
              </Link>
            </div>

            {/* Featured — live ResumePreview scaled to fill the card */}
            <div className="w-full lg:w-5/12">
              <div
                className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
                style={{ aspectRatio: "3/4" }}
              >
                <div
                  style={{
                    transform: "scale(0.42)",
                    transformOrigin: "top left",
                    width: PREVIEW_NATURAL_WIDTH,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <ResumeCardThumbnail data={CARD_PRESETS[3].data} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/60 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Career Resources ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full px-4 py-16 md:px-10 lg:px-16 xl:px-24">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-bold tracking-wider text-blue-600 uppercase">Level Up</div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Career Resources</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">Expert guides and templates to give your job search a competitive edge.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, iconColor: "text-blue-600", iconBg: "bg-blue-50", label: "GUIDE", title: "Resume Writing Tips", desc: "Evidence-based advice on structure, language, and impact statements that get callbacks." },
            { icon: Shield, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", label: "TECHNICAL", title: "ATS Optimization Guide", desc: "How modern applicant tracking systems parse resumes and exactly how to beat them." },
            { icon: MessageSquare, iconColor: "text-purple-600", iconBg: "bg-purple-50", label: "TEMPLATES", title: "Cover Letter Examples", desc: "Role-specific cover letter templates paired with resume examples for cohesive applications." },
            { icon: Lightbulb, iconColor: "text-amber-600", iconBg: "bg-amber-50", label: "PREPARATION", title: "Interview Preparation", desc: "STAR method answer bank and company research frameworks to ace your next interview." },
          ].map((card) => (
            <div key={card.title} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg">
              <div className={`mb-6 inline-flex rounded-xl p-3 ${card.iconBg} ${card.iconColor} w-fit`}>
                <card.icon className="size-6" />
              </div>
              <div className="mb-2 text-xs font-bold tracking-wider text-slate-400">{card.label}</div>
              <h3 className="mb-3 text-lg font-bold text-slate-900 group-hover:text-blue-600">{card.title}</h3>
              <p className="mb-6 text-sm text-slate-600 flex-1">{card.desc}</p>
              <Link href="#" className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                Read more <ArrowRight className="size-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>


    </div>
  );
}
