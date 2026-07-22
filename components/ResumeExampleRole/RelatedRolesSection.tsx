import { RolePageData } from "@/lib/resumeExampleRoles/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function RelatedRolesSection({ roles }: { roles: RolePageData["writingGuide"]["relatedRoles"] }) {
  if (!roles || roles.length === 0) return null;

  return (
    <div className="mb-20">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Explore Related Careers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role, i) => (
          <Link
            key={i}
            href={`/resume-examples/${role.slug}`}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5"
          >
            <span className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
              {role.title}
            </span>
            <ArrowRight className="size-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
