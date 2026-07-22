import { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoleExamplePageTemplate } from "@/components/ResumeExampleRole/RoleExamplePageTemplate";
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
import { RolePageData } from "@/lib/resumeExampleRoles/types";

// Registry of all available role pages
const ROLE_PAGES: Record<string, RolePageData> = {
  "product-manager": productManagerData,
  "software-engineer": softwareEngineerData,
  "sales": salesData,
  "project-manager": projectManagerData,
  "data-science": dataScienceData,
  "marketing": marketingData,
  "finance": financeData,
  "human-resources": humanResourcesData,
  "customer-support": customerSupportData,
  "graphic-design": graphicDesignData,
  "healthcare": healthcareData,
  "education": educationData,
};

type Props = {
  params: Promise<{ role: string }> | { role: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const role = resolvedParams.role?.replace(/\/$/, "");
  console.log("generateMetadata role:", role);
  const data = ROLE_PAGES[role];
  
  if (!data) {
    return {
      title: "Resume Examples not found",
    };
  }

  return {
    title: data.pageTitle,
    description: data.metaDescription,
    alternates: {
      canonical: `/resume-examples/${data.slug}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(ROLE_PAGES).map((slug) => ({
    role: slug,
  }));
}

export default async function RolePage({ params }: Props) {
  const resolvedParams = await params;
  const role = resolvedParams.role?.replace(/\/$/, "");
  console.log("RolePage component role:", role);
  const data = ROLE_PAGES[role];

  if (!data) {
    notFound();
  }

  return (
    <>
      {/* We add a transparent navigation bar here so the page fits the site. */}
      <RoleExamplePageTemplate data={data} />
    </>
  );
}
