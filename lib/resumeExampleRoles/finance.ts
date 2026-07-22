import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const financeData: RolePageData = {
  slug: "finance",
  title: "Financial Analyst",
  category: "Finance",
  pageTitle: "5 Finance & Financial Analyst Resume Examples for 2025",
  metaDescription: "Browse professionally written Finance resume examples. Learn how to highlight financial modeling, valuation, variance analysis, CFA credentials, and forecasting skills.",
  
  marketInsights: {
    medianSalary: "$75,000 – $135,000",
    education: "Bachelor's or Master's in Finance, Accounting, or Economics",
    yearsExperience: "2–8+ years",
    workStyle: "Hybrid / In-Office",
    careerPath: "Financial Analyst → Senior Analyst → Finance Manager → Director of FP&A → CFO",
    certifications: ["CFA (Chartered Financial Analyst)", "CPA", "FMVA (Financial Modeling & Valuation)"],
  },

  examples: [
    {
      id: "fin-sr-analyst",
      persona: {
        name: "Robert Sterling",
        location: "New York, NY",
        email: "robert.sterling@email.com",
      },
      headline: "Senior FP&A Financial Analyst (CFA Level II)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Robert Sterling", 
          email: "robert.sterling@email.com", 
          phone: "(212) 555-0199", 
          location: "New York, NY", 
          website: "", 
          linkedin: "linkedin.com/in/robertsterling-finance", 
          github: "", 
          summary: "Senior Financial Analyst with 6+ years of experience in Corporate FP&A, financial modeling, and strategic valuation. Expert in building 3-statement financial models, managing $150M+ annual operational budgets, and performing M&A due diligence. CFA Level II Candidate."
        },
        workExperiences: [
          { 
            id: "fin-we-1", 
            company: "Sterling Capital Holdings", 
            jobTitle: "Senior FP&A Analyst", 
            location: "New York, NY", 
            startDate: "Jan 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Build dynamic 3-statement financial models in Excel for quarterly board presentations, forecasting annual operating revenues of $150M+ with 98.5% forecast accuracy.\nIdentified $4.2M in operational cost-saving opportunities through variance analysis across 12 business units.\nPartnered with Corporate Development team on $45M acquisition, conducting Discounted Cash Flow (DCF) and LBO valuation modeling." 
          },
          { 
            id: "fin-we-2", 
            company: "Beacon Financial Services", 
            jobTitle: "Financial Analyst", 
            location: "New York, NY", 
            startDate: "Jun 2018", 
            endDate: "Dec 2020", 
            current: false, 
            bullets: "Automated monthly financial reporting packages using Power BI and SQL, cutting reporting turnaround time from 5 days to 4 hours.\nPrepared capital expenditure (CapEx) feasibility analysis for 15 retail location expansion projects." 
          }
        ],
        educations: [
          { 
            id: "fin-ed-1", 
            school: "New York University (Stern)", 
            degree: "B.S. Finance & Economics", 
            location: "New York, NY", 
            startDate: "Sep 2014", 
            endDate: "May 2018", 
            gpa: "3.85", 
            coursework: "Corporate Finance, Investment Analysis, Financial Statement Analysis, Econometrics" 
          }
        ],
        projects: [
          {
            id: "fin-proj-1",
            name: "Automated Treasury Management Dashboard",
            tech: "Power BI, SQL, Excel VBA",
            link: "",
            date: "2023",
            bullets: "Engineered real-time liquidity and working capital tracking dashboard monitoring $30M daily cash flow."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Financial Modeling (3-Statement / DCF)", rating: 5 },
            { skill: "FP&A & Budget Forecasting", rating: 5 },
            { skill: "Variance & CapEx Analysis", rating: 5 },
            { skill: "Advanced Excel (VBA / Macros)", rating: 5 },
            { skill: "SQL & Power BI / Tableau", rating: 4 },
            { skill: "SAP / Oracle Financials", rating: 4 }
          ],
          descriptions: "Financial Modeling: DCF, LBO, 3-Statement Models, Scenario & Sensitivity Analysis, M&A Due Diligence\nSoftware & Tools: Advanced Excel (VBA/Macros), SQL, Power BI, Tableau, SAP, Oracle NetSuite, Bloomberg Terminal"
        }
      },
      critique: "A rock-solid Finance resume with heavy focus on quantifiable financial impact ($150M+ budget, 98.5% forecast accuracy, $4.2M cost savings, $45M M&A modeling)."
    },
    {
      id: "fin-investment-banking",
      persona: {
        name: "Victoria Vance",
        location: "New York, NY",
        email: "victoria.vance@email.com",
      },
      headline: "Investment Banking Associate (M&A)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Victoria Vance", 
          email: "victoria.vance@email.com", 
          phone: "(212) 555-0812", 
          location: "New York, NY", 
          website: "", 
          linkedin: "linkedin.com/in/victoriavance-ib", 
          github: "", 
          summary: "Investment Banking Associate with 4+ years of experience executing cross-border M&A transactions, LBO modeling, and debt financing valued at over $1.2B. Expert in constructing detailed accretion/dilution models, confidential information memorandums (CIM), and pitchbooks for private equity sponsors."
        },
        workExperiences: [
          { 
            id: "fin-we-3", 
            company: "Goldman & Partners Capital", 
            jobTitle: "Investment Banking Associate - Technology M&A", 
            location: "New York, NY", 
            startDate: "Jul 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Executed 6 closed sell-side and buy-side M&A transactions representing aggregate enterprise value of $1.2B in B2B SaaS and cloud infrastructure.\nBuilt comprehensive LBO and accretion/dilution models to evaluate transaction structures, leverage capacity, and IRR targets for PE clients.\nDrafted confidential pitchbooks and management presentation decks delivered to C-suite decision makers during active auction processes." 
          },
          { 
            id: "fin-we-4", 
            company: "Morgan & Chase Advisory", 
            jobTitle: "Investment Banking Analyst", 
            location: "New York, NY", 
            startDate: "Jul 2019", 
            endDate: "Jun 2021", 
            current: false, 
            bullets: "Performed precedent transactions, comparable company analysis (Comps), and DCF valuations for 30+ client engagements.\nManaged virtual data rooms (VDR) and coordinated buyer due diligence inquiries during 4 active sell-side processes." 
          }
        ],
        educations: [
          { 
            id: "fin-ed-2", 
            school: "Columbia University", 
            degree: "B.S. Financial Economics", 
            location: "New York, NY", 
            startDate: "Sep 2015", 
            endDate: "May 2019", 
            gpa: "3.92", 
            coursework: "Corporate Valuation, Advanced Corporate Finance, Investments, Accounting" 
          }
        ],
        projects: [
          {
            id: "fin-proj-2",
            name: "$500M SaaS Cross-Border LBO",
            tech: "Excel LBO Modeling, Pitchbooks",
            link: "",
            date: "2023",
            bullets: "Constructed debt paydown and dividend recapitalization model achieving 24.5% projected 5-year sponsor IRR."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "M&A Valuation (Comps/Precedents/DCF)", rating: 5 },
            { skill: "LBO & Accretion/Dilution Modeling", rating: 5 },
            { skill: "Pitchbook & CIM Preparation", rating: 5 },
            { skill: "CapIQ & FactSet", rating: 4 },
            { skill: "Virtual Data Room (VDR) Mgmt", rating: 4 },
            { skill: "Financial Statement Analysis", rating: 5 }
          ],
          descriptions: "IB Tools: Capital IQ, FactSet, Bloomberg, Thomson ONE, Virtual Data Rooms (Datasite, Intralinks)\nValuation: LBO, DCF, Trading Comps, Transaction Comps, Accretion/Dilution, Debt Paydown Schedules"
        }
      },
      critique: "A sleek, dark-accented Investment Banking resume using the Onyx preset. It immediately commands respect with transaction volume ($1.2B enterprise value), LBO expertise, and elite institutional credentials."
    },
    {
      id: "fin-corporate-accounting",
      persona: {
        name: "Marcus Thorne, CPA",
        location: "Chicago, IL",
        email: "marcus.thorne@email.com",
      },
      headline: "Accounting Manager (CPA)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#d97706", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Marcus Thorne, CPA", 
          email: "marcus.thorne@email.com", 
          phone: "(312) 555-0941", 
          location: "Chicago, IL", 
          website: "", 
          linkedin: "linkedin.com/in/marcusthorne-cpa", 
          github: "", 
          summary: "CPA-certified Accounting Manager with 7+ years of experience overseeing general ledger accounting, monthly financial closes, and SOX internal controls compliance. Former Big 4 Senior Auditor skilled in NetSuite, GAAP compliance, revenue recognition (ASC 606), and audit management."
        },
        workExperiences: [
          { 
            id: "fin-we-5", 
            company: "Midwest Distribution Corp", 
            jobTitle: "Corporate Accounting Manager", 
            location: "Chicago, IL", 
            startDate: "Aug 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Direct monthly, quarterly, and year-end accounting close procedures for a $200M enterprise, shortening close cycle from 10 days to 4 days.\nManage team of 6 staff accountants responsible for GL, Accounts Payable, Accounts Receivable, and payroll reconciliation.\nLead ASC 606 revenue recognition audits with external Big 4 auditing firm, ensuring zero material weaknesses identified." 
          },
          { 
            id: "fin-we-6", 
            company: "PwC (PricewaterhouseCoopers)", 
            jobTitle: "Senior Audit Associate", 
            location: "Chicago, IL", 
            startDate: "Sep 2017", 
            endDate: "Jul 2021", 
            current: false, 
            bullets: "Executed financial statement audits and SOX 404 internal control testing for 10+ Fortune 500 manufacturing and retail clients.\nIdentified control deficiencies and authored management recommendation letters to audit committees." 
          }
        ],
        educations: [
          { 
            id: "fin-ed-3", 
            school: "DePaul University", 
            degree: "B.S. Accounting & M.S. Accountancy", 
            location: "Chicago, IL", 
            startDate: "Sep 2012", 
            endDate: "May 2017", 
            gpa: "3.88", 
            coursework: "Advanced Accounting, Audit & Assurance, Federal Taxation, Forensic Accounting" 
          }
        ],
        projects: [
          {
            id: "fin-proj-3",
            name: "Oracle NetSuite ERP Implementation",
            tech: "NetSuite, BlackLine",
            link: "",
            date: "2022",
            bullets: "Automated general ledger account reconciliations using BlackLine, saving 40 hours during monthly close."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "CPA Certified", rating: 5 },
            { skill: "GAAP & ASC 606 Compliance", rating: 5 },
            { skill: "Month-End Close Automation", rating: 5 },
            { skill: "NetSuite & BlackLine", rating: 5 },
            { skill: "SOX 404 Internal Controls", rating: 5 },
            { skill: "External Audit Management", rating: 4 }
          ],
          descriptions: "Accounting Systems: NetSuite, QuickBooks Enterprise, Oracle Financials, BlackLine, Workday Financials\nCompliance: US GAAP, ASC 606 (Revenue Recognition), ASC 842 (Leases), SOX 404 Internal Controls, Audit Defense"
        }
      },
      critique: "A classic, elegant accounting resume using the Bronzor preset. Highlights CPA credentials, Big 4 audit history, net-close cycle acceleration (10 days to 4 days), and ERP system mastery."
    }
  ],

  writingGuide: {
    intro: "Writing a Finance resume requires demonstrating analytical rigor, precision, and financial impact. Highlight model types, software tools, budget sizes managed, and cost-reduction achievements.",
    tips: [
      "Quantify budget scale, revenue forecasted, and cost savings achieved.",
      "Explicitly state financial modeling techniques (DCF, LBO, 3-Statement, Variance Analysis).",
      "Mention financial software (SAP, Oracle, Bloomberg) and reporting tools (Power BI, Tableau, Excel VBA)."
    ],
    headlineExamples: [
      {
        strong: "Senior Financial Analyst | FP&A & M&A Valuation | $150M+ Budget Management (CFA)",
        weak: "Finance professional seeking analyst role",
        explanation: "Shows seniority, specializations, budget scale, and CFA credential immediately."
      }
    ],
    summaryExamples: [
      {
        strong: "Senior FP&A Analyst with 6+ years of experience constructing 3-statement financial models and managing $150M+ operating budgets. Proven track record of identifying $4.2M in cost savings.",
        weak: "Finance graduate with good Excel skills looking for an analyst job.",
        explanation: "Provides concrete financial scope and value."
      }
    ],
    bulletGuidance: "Use: Financial Action + Model/Tool + Dollar Scale + Result. Example: 'Identified $4.2M in operational cost-saving opportunities through variance analysis across 12 business units.'",
    expertQuote: "In finance, precision is non-negotiable. Put your exact budget sizes and model types upfront.",
    faq: [
      {
        q: "Should I list CFA level if not fully charterholder?",
        a: "Yes! 'CFA Level II Candidate' or 'Passed CFA Level I' is highly respected."
      }
    ],
    relatedRoles: [
      { title: "Investment Banking Analyst", slug: "investment-banking-analyst" },
      { title: "FP&A Manager", slug: "fpa-manager" },
      { title: "Accounting Manager", slug: "accounting-manager" }
    ]
  }
};
