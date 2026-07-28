import { RolePageData } from "@/lib/resumeExampleRoles/types";
import { DollarSign, GraduationCap, Briefcase, MapPin, TrendingUp, Award } from "lucide-react";

export function MarketInsightsBlock({ insights }: { insights: RolePageData["marketInsights"] }) {
  const cards = [
    { icon: DollarSign, label: "Median Salary", value: insights.medianSalary },
    { icon: GraduationCap, label: "Typical Education", value: insights.education },
    { icon: Briefcase, label: "Experience Required", value: insights.yearsExperience },
    { icon: MapPin, label: "Work Environment", value: insights.workStyle },
    { icon: TrendingUp, label: "Common Career Path", value: insights.careerPath, fullWidth: true },
    { icon: Award, label: "Top Certifications", value: insights.certifications.join(", "), fullWidth: true },
  ];

  return (
    <div className="mb-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Market Insights</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div 
            key={i} 
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
              card.fullWidth ? "sm:col-span-2 lg:col-span-2" : ""
            }`}
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <card.icon className="size-5" />
            </div>
            <div className="text-sm font-medium text-slate-500 mb-1">{card.label}</div>
            <div className="font-semibold text-slate-900 leading-snug">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
