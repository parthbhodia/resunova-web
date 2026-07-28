import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const salesData: RolePageData = {
  slug: "sales",
  title: "Sales Representative",
  category: "Sales",
  pageTitle: "5 Sales Resume Examples & Writing Tips for 2025",
  metaDescription: "Browse professionally written sales resume examples. Discover how to highlight quota attainment, deal size, and CRM skills to land top sales interviews.",
  
  marketInsights: {
    medianSalary: "$55,000 – $130,000",
    education: "Bachelor's degree (any field)",
    yearsExperience: "0–10+ years",
    workStyle: "Hybrid / In-Office",
    careerPath: "SDR → AE → Senior AE → Sales Manager → VP of Sales",
    certifications: ["Salesforce Certified Administrator", "HubSpot Sales Software", "Sandler Selling System"],
  },

  examples: [
    {
      id: "sales-ae",
      persona: {
        name: "Marco Rodriguez",
        location: "Chicago, IL",
        email: "marco.rodriguez@email.com",
      },
      headline: "Account Executive (SaaS & B2B)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Marco Rodriguez", 
          email: "marco.rodriguez@email.com", 
          phone: "(312) 555-0144", 
          location: "Chicago, IL", 
          website: "marcorodriguez.sales", 
          linkedin: "linkedin.com/in/marcorodriguez-sales", 
          github: "", 
          summary: "Top-performing B2B SaaS Account Executive with 5+ years of experience closing mid-market and enterprise deals. Consistent Presidents Club winner with a proven track record of exceeding annual sales quotas by 130%+. Skilled in consultative selling, MEDDPICC methodology, and full-cycle pipeline management."
        },
        workExperiences: [
          { 
            id: "sales-we-1", 
            company: "CloudScale Software", 
            jobTitle: "Senior Account Executive", 
            location: "Chicago, IL", 
            startDate: "Jan 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Closed $2.4M in ARR in FY2023, achieving 142% of annual quota and ranking #2 AE out of 45 representatives nationwide.\nManaged full sales cycle for 50+ prospective mid-market accounts from outbound prospecting to contract negotiation and closing.\nShortened average deal cycle from 90 days to 65 days by implementing value-based discovery frameworks and structured mutual action plans.\nPartnered with Sales Engineering to deliver customized product demonstrations for C-suite buyers at Fortune 500 prospects." 
          },
          { 
            id: "sales-we-2", 
            company: "Apex Tech Solutions", 
            jobTitle: "Account Executive", 
            location: "Chicago, IL", 
            startDate: "Jun 2019", 
            endDate: "Dec 2021", 
            current: false, 
            bullets: "Exceeded annual sales quota by 125% in 2020 ($1.2M ARR target), earning President's Club recognition.\nGenerated 40% of self-sourced pipeline through targeted cold outreach, LinkedIn Sales Navigator, and industry event networking.\nUtilized Salesforce CRM to maintain clean pipeline analytics, forecast deal closing probabilities, and document account interaction histories." 
          }
        ],
        educations: [
          { 
            id: "sales-ed-1", 
            school: "DePaul University", 
            degree: "B.S. Business Administration (Marketing)", 
            location: "Chicago, IL", 
            startDate: "Sep 2015", 
            endDate: "May 2019", 
            gpa: "3.7", 
            coursework: "Sales Management, Consumer Behavior, Professional Speaking, Financial Accounting" 
          }
        ],
        projects: [
          {
            id: "sales-proj-1",
            name: "Mid-Market Playbook Standardization",
            tech: "MEDDPICC, Salesforce",
            link: "",
            date: "2023",
            bullets: "Co-authored the mid-market sales team discovery playbook, standardizing qualification questions and objection handling strategies across 20 reps."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "B2B SaaS Sales", rating: 5 },
            { skill: "Salesforce CRM", rating: 5 },
            { skill: "MEDDPICC", rating: 5 },
            { skill: "Consultative Selling", rating: 5 },
            { skill: "Pipeline Management", rating: 4 },
            { skill: "Contract Negotiation", rating: 4 }
          ],
          descriptions: "Sales Methodologies: MEDDPICC, Challenger Sale, Value Selling, Solution Selling\nTools & CRM: Salesforce, HubSpot, LinkedIn Sales Navigator, Outreach.io, Gong, ZoomInfo\nCore Competencies: Pipeline Generation, Contract Negotiation, C-Suite Pitching, Account Mapping, Ramp Time Optimization"
        }
      },
      critique: "An outstanding Account Executive resume that prioritizes hard metrics. Quota attainment numbers (142%, 125%), total ARR closed ($2.4M), and rankings (#2 out of 45 reps) are explicitly front and center, providing undeniable proof of sales performance."
    },
    {
      id: "sales-manager",
      persona: {
        name: "Sandra Osei",
        location: "Atlanta, GA",
        email: "sandra.osei@email.com",
      },
      headline: "Regional Sales Manager",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#dc2626", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Sandra Osei", 
          email: "sandra.osei@email.com", 
          phone: "(404) 555-0811", 
          location: "Atlanta, GA", 
          website: "", 
          linkedin: "linkedin.com/in/sandraosei-sales", 
          github: "", 
          summary: "Results-driven Regional Sales Manager with 8+ years of sales leadership experience building and scaling high-performing enterprise sales teams. Skilled in territory planning, revenue forecasting, talent development, and executive relationship building. Led team to achieve 118% of aggregate annual quota ($18M total volume)."
        },
        workExperiences: [
          { 
            id: "sales-we-3", 
            company: "Nexus Communications", 
            jobTitle: "Regional Sales Manager", 
            location: "Atlanta, GA", 
            startDate: "Oct 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Directly manage a team of 10 Enterprise Account Executives covering the Southeast territory, driving $18M+ in total annual recurring revenue.\nAttained 118% of team revenue target in FY2023 through rigorous weekly call coaching, deal reviews, and strategic executive alignment.\nReduced team turnover from 25% to 8% by establishing structured onboarding, clear career development frameworks, and mentorship programs.\nDesigned and executed new regional go-to-market strategies, expanding market share in manufacturing and healthcare sectors by 35%." 
          },
          { 
            id: "sales-we-4", 
            company: "Global Telecom Systems", 
            jobTitle: "Sales Team Lead → Senior AE", 
            location: "Atlanta, GA", 
            startDate: "Aug 2016", 
            endDate: "Sep 2020", 
            current: false, 
            bullets: "Promoted from Senior AE to Team Lead in 2018 to manage a squad of 5 junior reps while maintaining an individual quota.\nPersonal sales performance exceeded quota for 12 consecutive quarters, achieving 135% overall lifetime average quota attainment.\nAssisted VP of Sales in rolling out Gong.io call analytics software across a 60-person organization to improve team-wide closing rates." 
          }
        ],
        educations: [
          { 
            id: "sales-ed-2", 
            school: "Emory University", 
            degree: "B.A. Economics", 
            location: "Atlanta, GA", 
            startDate: "Aug 2012", 
            endDate: "May 2016", 
            gpa: "3.8", 
            coursework: "Corporate Finance, Microeconomics, Statistics, Managerial Leadership" 
          }
        ],
        projects: [
          {
            id: "sales-proj-2",
            name: "Enterprise Onboarding Program",
            tech: "Gong.io, Lessonly",
            link: "",
            date: "2022",
            bullets: "Redesigned 6-week rep onboarding curriculum, cutting new hire time-to-first-deal from 90 days to 54 days."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Sales Team Leadership", rating: 5 },
            { skill: "Revenue Forecasting", rating: 5 },
            { skill: "Territory Planning", rating: 5 },
            { skill: "Executive Coaching", rating: 4 },
            { skill: "Salesforce CRM", rating: 5 },
            { skill: "Deal Structuring", rating: 4 }
          ],
          descriptions: "Leadership & Ops: Sales Coaching, Revenue Forecasting, Territory Management, Talent Acquisition, Commission Plan Design\nTools: Salesforce, Gong.io, Clari, Outreach, Tableau\nMethodologies: SPIN Selling, MEDDPICC, Target Account Selling (TAS)"
        }
      },
      critique: "A top-tier sales leadership resume. It clearly separates individual closing capability from team-wide revenue enablement. Metrics focus on team quota delivery ($18M / 118%), rep retention, and ramp time reduction, demonstrating holistic leadership."
    },
    {
      id: "sales-sdr",
      persona: {
        name: "Tyler Brooks",
        location: "Denver, CO",
        email: "tyler.brooks@email.com",
      },
      headline: "Sales Development Representative (SDR)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Tyler Brooks", 
          email: "tyler.brooks@email.com", 
          phone: "(303) 555-0129", 
          location: "Denver, CO", 
          website: "", 
          linkedin: "linkedin.com/in/tylerbrooks-sdr", 
          github: "", 
          summary: "High-energy Sales Development Representative with 2+ years of outbound cold prospecting experience in B2B SaaS. Expert in cold calling, multi-touch email sequences, and qualifying decision-makers. Generated over $850k in SQL pipeline value in 2023."
        },
        workExperiences: [
          { 
            id: "sales-we-5", 
            company: "Elevate Analytics", 
            jobTitle: "Outbound SDR", 
            location: "Denver, CO", 
            startDate: "Jan 2023", 
            endDate: "Present", 
            current: true, 
            bullets: "Conduct 60+ cold calls and send 80+ personalized emails daily to C-suite and VP-level prospects in cybersecurity.\nConsistently hit 120%+ of monthly Sales Qualified Lead (SQL) quota, generating $850k+ in pipeline value for AEs in 2023.\nRanked #1 SDR in the department for 3 consecutive quarters based on meeting setting efficiency and prospect conversion rates.\nCollaborate weekly with Account Executives to research target account lists using ZoomInfo and LinkedIn Sales Navigator." 
          },
          { 
            id: "sales-we-6", 
            company: "BrightPoint Marketing", 
            jobTitle: "Junior Sales Specialist", 
            location: "Denver, CO", 
            startDate: "May 2022", 
            endDate: "Dec 2022", 
            current: false, 
            bullets: "Handled inbound leads, responding to web inquiries within 10 minutes to schedule product discovery calls.\nAchieved 110% of inbound lead conversion target by effectively applying BANT (Budget, Authority, Need, Timeline) qualification." 
          }
        ],
        educations: [
          { 
            id: "sales-ed-3", 
            school: "University of Colorado Boulder", 
            degree: "B.S. Communications", 
            location: "Boulder, CO", 
            startDate: "Aug 2018", 
            endDate: "May 2022", 
            gpa: "3.5", 
            coursework: "Persuasive Communication, Public Speaking, Negotiation, Digital Marketing" 
          }
        ],
        projects: [
          {
            id: "sales-proj-3",
            name: "Outreach Email Sequence Redesign",
            tech: "Outreach.io, A/B Testing",
            link: "",
            date: "2023",
            bullets: "A/B tested subject lines and body copy on cold outreach sequences, increasing open rates from 22% to 38%."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Cold Calling", rating: 5 },
            { skill: "Outbound Prospecting", rating: 5 },
            { skill: "Salesforce", rating: 4 },
            { skill: "Outreach.io / Salesloft", rating: 5 },
            { skill: "ZoomInfo", rating: 4 },
            { skill: "BANT / Qualification", rating: 4 }
          ],
          descriptions: "Tools: Salesforce CRM, Outreach.io, ZoomInfo, LinkedIn Sales Navigator, Chili Piper, Loom\nSkills: Cold Calling, Email Sequence Writing, Objection Handling, Lead Qualification (BANT), Pipeline Generation"
        }
      },
      critique: "An exemplary SDR resume showing sheer activity volume paired with quality results. Highlighting metrics like daily activity (60+ calls, 80+ emails), quota attainment %, and pipeline value generated ($850k+) gives hiring managers immediate trust in the candidate's work ethic and sales discipline."
    }
  ],

  writingGuide: {
    intro: "Writing a Sales resume is all about numbers. Unlike many other roles where achievements can be subjective, sales performance is binary: you either hit your quota or you didn't. To write a compelling sales resume, focus on your quota attainment percentages, total revenue generated, average deal sizes, and the methodologies you use to close business.",
    tips: [
      "Always state your annual or quarterly quota attainment percentage (e.g., '125% of annual quota').",
      "Include hard dollar values for revenue closed or pipeline generated ($1.5M ARR, $800k SQL pipeline).",
      "List the exact CRM tools and sales tech stack you use daily (Salesforce, Outreach, Gong, ZoomInfo).",
      "Mention recognized sales methodologies you are trained in (MEDDPICC, Challenger Sale, SPIN Selling)."
    ],
    headlineExamples: [
      {
        strong: "Enterprise Account Executive | B2B SaaS | $2.5M ARR Closed (135% Quota Avg)",
        weak: "Sales Professional looking for AE roles",
        explanation: "The strong headline highlights seniority, industry, total revenue closed, and quota attainment right away."
      }
    ],
    summaryExamples: [
      {
        strong: "Top-performing B2B SaaS Account Executive with 6+ years of experience closing mid-market and enterprise deals. President's Club winner with lifetime average quota attainment of 128%. Expert in MEDDPICC methodology and managing 90-day deal cycles.",
        weak: "Results-driven sales representative with passion for closing deals and building customer relationships. Looking to bring my hard work to a fast-growing sales team.",
        explanation: "The strong summary immediately provides proof of high performance using metrics and methodology keywords."
      }
    ],
    bulletGuidance: "Structure your experience bullets around: Action + Strategy + Metric + Result. Example: 'Shortened average deal cycle from 90 days to 65 days by implementing value-based discovery frameworks and structured mutual action plans.'",
    expertQuote: "When I review a sales resume, I look for numbers first. If I don't see quota attainment percentages or ARR numbers in the first 10 seconds, it goes straight to the pass pile.",
    faq: [
      {
        q: "What if I missed quota one year?",
        a: "Focus on your overall lifetime average or highlight your best quarters. You don't need to state '80% quota in 2021'; instead, highlight 'Exceeded quota in 6 out of 8 quarters' or focus on self-sourced pipeline."
      },
      {
        q: "Should I include non-sales work experience?",
        a: "If you are an entry-level SDR, customer service, retail, or hospitality experience is relevant as it proves communication skills. For experienced AEs, keep the focus strictly on B2B/B2C sales roles."
      }
    ],
    relatedRoles: [
      { title: "Account Manager", slug: "account-manager" },
      { title: "Business Development Rep", slug: "bdr" },
      { title: "Sales Engineer", slug: "sales-engineer" },
      { title: "Customer Success Manager", slug: "csm" }
    ]
  }
};
