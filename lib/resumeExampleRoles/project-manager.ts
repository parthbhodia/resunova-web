import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const projectManagerData: RolePageData = {
  slug: "project-manager",
  title: "Project Manager",
  category: "Project Management",
  pageTitle: "5 Project Manager Resume Examples & Writing Tips for 2025",
  metaDescription: "Browse professionally written project manager resume examples. Learn how to highlight budget control, PMP certifications, Agile/Scrum delivery, and cross-functional leadership.",
  
  marketInsights: {
    medianSalary: "$95,000 – $145,000",
    education: "Bachelor's degree in Business, CS, or related field",
    yearsExperience: "3–10+ years",
    workStyle: "Hybrid / Remote",
    careerPath: "Project Coordinator → Project Manager → Senior PM → Program Manager → Director of PMO",
    certifications: ["PMP (Project Management Professional)", "CSM (Certified ScrumMaster)", "PRINCE2", "CAPM"],
  },

  examples: [
    {
      id: "pm-pmp-senior",
      persona: {
        name: "Elena Rostova",
        location: "Chicago, IL",
        email: "elena.rostova@email.com",
      },
      headline: "Senior Technical Project Manager (PMP)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#0284c7", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Elena Rostova", 
          email: "elena.rostova@email.com", 
          phone: "(312) 555-0188", 
          location: "Chicago, IL", 
          website: "elenarostova.pm", 
          linkedin: "linkedin.com/in/elena-rostova-pmp", 
          github: "", 
          summary: "PMP-certified Senior Technical Project Manager with 8+ years of experience leading complex enterprise software deployments and cloud migrations. Proven track record of managing $5M+ project budgets, managing cross-functional global teams of 25+, and achieving 98% on-time delivery across 30+ major client implementations."
        },
        workExperiences: [
          { 
            id: "pm-we-1", 
            company: "Vanguard Tech Solutions", 
            jobTitle: "Senior Project Manager", 
            location: "Chicago, IL", 
            startDate: "Feb 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Managed a portfolio of 6 concurrent enterprise cloud transformation projects totaling $6.5M in budget, delivering all projects within ±3% of financial forecasts.\nLed cross-functional teams of 20+ software engineers, QA testers, UX designers, and DevOps specialists across 3 time zones.\nReduced project delivery bottlenecks by 30% through the implementation of Jira automation workflows and standardized sprint retrospectives.\nPresented bi-weekly status dashboards to C-suite executives and client sponsors, maintaining a 96% Client Satisfaction (CSAT) score." 
          },
          { 
            id: "pm-we-2", 
            company: "Apex Systems Group", 
            jobTitle: "Project Manager", 
            location: "Chicago, IL", 
            startDate: "Jan 2018", 
            endDate: "Jan 2021", 
            current: false, 
            bullets: "Directed full-lifecycle implementation of custom ERP software for 4 Healthcare clients with zero high-severity post-launch defects.\nMitigated key project risks by developing rigorous RAID logs (Risks, Assumptions, Issues, Dependencies) and contingency plans.\nManaged vendor relationships and contract negotiations, saving $120k in external consulting fees over 2 years." 
          }
        ],
        educations: [
          { 
            id: "pm-ed-1", 
            school: "Northwestern University", 
            degree: "B.S. Industrial Engineering & Management Sciences", 
            location: "Evanston, IL", 
            startDate: "Sep 2013", 
            endDate: "Jun 2017", 
            gpa: "3.8", 
            coursework: "Operations Research, Project Management, Supply Chain Logistics, Financial Engineering" 
          }
        ],
        projects: [
          {
            id: "pm-proj-1",
            name: "Enterprise ERP Cloud Migration",
            tech: "Jira, MS Project, AWS",
            link: "",
            date: "2023",
            bullets: "Over-delivered a 14-month ERP cloud migration project 3 weeks ahead of schedule and $150k under budget for a major retail client."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "PMP Certified", rating: 5 },
            { skill: "Agile / Scrum / Waterfall", rating: 5 },
            { skill: "Budgeting & Cost Control", rating: 5 },
            { skill: "Risk Management (RAID)", rating: 5 },
            { skill: "Jira / Confluence / MS Project", rating: 4 },
            { skill: "Stakeholder Management", rating: 5 }
          ],
          descriptions: "Methodologies: Agile, Scrum, Kanban, Waterfall, Hybrid, Lean Six Sigma\nTools: Jira, Confluence, MS Project, Asana, Smartsheet, Monday.com, Trello\nCompetencies: Resource Allocation, Risk Management (RAID), Scope Management, Budget Forecasting ($5M+), Vendor Management, Executive Reporting"
        }
      },
      critique: "A model project manager resume. It prominently highlights PMP certification, portfolio budget sizes ($6.5M), team scale (20+ engineers), and on-time/under-budget delivery metrics. Risk management and stakeholder communication are effectively demonstrated."
    },
    {
      id: "pm-agile-scrum",
      persona: {
        name: "Marcus Vance",
        location: "Austin, TX",
        email: "marcus.vance@email.com",
      },
      headline: "Agile Project Manager / Scrum Master (CSM)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Marcus Vance", 
          email: "marcus.vance@email.com", 
          phone: "(512) 555-0922", 
          location: "Austin, TX", 
          website: "", 
          linkedin: "linkedin.com/in/marcusvance-pm", 
          github: "", 
          summary: "Certified ScrumMaster (CSM) and Agile Project Manager with 5+ years of experience facilitating sprint ceremonies, removing team impediments, and driving software delivery velocity for fast-growing SaaS products. Increased sprint commitment completion rate from 72% to 94% across 3 engineering squads."
        },
        workExperiences: [
          { 
            id: "pm-we-3", 
            company: "ScaleUp SaaS Inc.", 
            jobTitle: "Agile Project Manager / Scrum Master", 
            location: "Austin, TX", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Facilitate daily standups, backlog grooming, sprint planning, and retrospectives for 3 dedicated engineering teams (18 engineers & designers).\nBoosted average team velocity by 28% over 12 months by removing operational blockers and shielding engineers from ad-hoc feature requests.\nPartner with Product Managers to refine user stories, define Acceptance Criteria, and prioritize product backlogs in Jira.\nTrack and report sprint burndown charts, cumulative flow diagrams, and velocity trends to engineering management." 
          },
          { 
            id: "pm-we-4", 
            company: "Innovate Digital Agency", 
            jobTitle: "Associate Project Manager", 
            location: "Austin, TX", 
            startDate: "Jun 2019", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Coordinated digital web development projects for 12 client accounts, ensuring scope adherence and timely milestone delivery.\nTransitioned team from traditional Waterfall model to Agile Scrum framework, reducing project cycle times by 4 weeks on average." 
          }
        ],
        educations: [
          { 
            id: "pm-ed-2", 
            school: "University of Texas at Austin", 
            degree: "B.A. Communications & Technology", 
            location: "Austin, TX", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.6", 
            coursework: "Agile Methodologies, Technical Writing, Interpersonal Communication, Group Dynamics" 
          }
        ],
        projects: [
          {
            id: "pm-proj-2",
            name: "Agile Transformation Initiative",
            tech: "Jira Align, Confluence",
            link: "",
            date: "2022",
            bullets: "Led internal Agile training workshops for 40 team members during corporate shift to Scaled Agile Framework (SAFe)."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Agile & Scrum Facilitation", rating: 5 },
            { skill: "Jira & Confluence", rating: 5 },
            { skill: "Sprint Planning & Grooming", rating: 5 },
            { skill: "Velocity & Burndown Tracking", rating: 4 },
            { skill: "Stakeholder Alignment", rating: 4 },
            { skill: "CSM Certified", rating: 5 }
          ],
          descriptions: "Frameworks: Scrum, Kanban, SAFe (Scaled Agile Framework), Hybrid Agile\nTools: Jira, Confluence, Miro, Figma, Slack, Asana\nCore Focus: Sprint Velocity, Impediment Removal, Backlog Refinement, Capacity Planning, Retrospective Continuous Improvement"
        }
      },
      critique: "A fantastic resume for an Agile PM / Scrum Master role. It emphasizes team velocity (+28%), sprint commitment completion rate improvement (72% -> 94%), and core ceremony facilitation without getting lost in generic project descriptions."
    },
    {
      id: "pm-construction-operations",
      persona: {
        name: "David Sterling",
        location: "Dallas, TX",
        email: "david.sterling@email.com",
      },
      headline: "Construction & Infrastructure Project Manager",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#d97706", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "David Sterling", 
          email: "david.sterling@email.com", 
          phone: "(214) 555-0311", 
          location: "Dallas, TX", 
          website: "", 
          linkedin: "linkedin.com/in/davidsterling-pm", 
          github: "", 
          summary: "Construction Project Manager with 7+ years of experience overseeing commercial building, infrastructure development, and site renovation projects up to $15M in value. Expert in subcontractor bidding, OSHA safety compliance, budget tracking, and permitting."
        },
        workExperiences: [
          { 
            id: "pm-we-5", 
            company: "Apex Commercial Builders", 
            jobTitle: "Project Manager", 
            location: "Dallas, TX", 
            startDate: "Aug 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Supervise daily operations for 3 commercial construction projects valued at $12M total, coordinating 15+ subcontractor trades.\nNegotiated subcontractor contracts and material vendor pricing, saving $210k against initial project cost estimates.\nMaintained zero OSHA recordable safety incidents across 150,000+ total labor hours worked over 3 consecutive years.\nManaged municipal zoning permits, environmental inspections, and change orders with city officials." 
          },
          { 
            id: "pm-we-6", 
            company: "Lone Star Contractors", 
            jobTitle: "Assistant Project Manager", 
            location: "Fort Worth, TX", 
            startDate: "Jun 2017", 
            endDate: "Jul 2020", 
            current: false, 
            bullets: "Managed RFIs (Request for Information), submittals, and daily site logs using Procore software for a $20M multi-family housing development.\nPrepared monthly billing applications and pay requests for bank audits and property owners." 
          }
        ],
        educations: [
          { 
            id: "pm-ed-3", 
            school: "Texas A&M University", 
            degree: "B.S. Construction Science", 
            location: "College Station, TX", 
            startDate: "Aug 2013", 
            endDate: "May 2017", 
            gpa: "3.5", 
            coursework: "Construction Estimating, Scheduling, Building Codes, OSHA Safety, Structural Systems" 
          }
        ],
        projects: [
          {
            id: "pm-proj-3",
            name: "Medical Office Building Construction",
            tech: "Procore, Primavera P6",
            link: "",
            date: "2023",
            bullets: "Delivered a 45,000 sq. ft. medical facility 2 weeks ahead of scheduled grand opening date."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Construction Management", rating: 5 },
            { skill: "Procore / Primavera P6", rating: 5 },
            { skill: "OSHA 30-Hour Certified", rating: 5 },
            { skill: "Vendor & Subcontractor Mgmt", rating: 5 },
            { skill: "Budgeting & Cost Estimating", rating: 4 },
            { skill: "Permitting & Quality Control", rating: 4 }
          ],
          descriptions: "Software: Procore, Primavera P6, AutoDesk AutoCAD, MS Project, Excel (VLOOKUP, Pivot Tables)\nSafety & Codes: OSHA 30-Hour Building Construction, International Building Code (IBC), Subcontractor Bidding, Change Order Mgmt"
        }
      },
      critique: "A crisp operations/construction PM resume demonstrating site leadership, regulatory compliance (OSHA), subcontractor management, and large budget oversight ($12M–$15M)."
    }
  ],

  writingGuide: {
    intro: "Writing a Project Manager resume requires showcasing your ability to deliver projects on time, within scope, and under budget. Hiring managers look for clear indicators of methodology mastery (Agile, Scrum, Waterfall, PMP), team leadership size, and financial responsibility.",
    tips: [
      "Always state the dollar value of the project budgets you managed ($1M, $5M, $10M+).",
      "Highlight key certifications like PMP, CSM, or Prince2 right next to your name and in your headline.",
      "Quantify impact using metrics: % on-time delivery, % under budget, velocity improvements, or defect reduction rates.",
      "Specify the project management software tools you excel in (Jira, Confluence, MS Project, Procore, Smartsheet)."
    ],
    headlineExamples: [
      {
        strong: "Senior Technical Project Manager | PMP® | Cloud & Enterprise SaaS ($5M+ Budgets)",
        weak: "Experienced Project Manager looking for a new role",
        explanation: "The strong headline establishes certification, domain focus, and project budget scale immediately."
      }
    ],
    summaryExamples: [
      {
        strong: "PMP-certified Project Manager with 7+ years of experience leading cross-functional teams in enterprise SaaS deployments. Managed budgets up to $8M while maintaining a 97% on-time project completion rate across 25+ major launches.",
        weak: "Organized project manager with good communication skills. Experienced in leading meetings and managing schedules for software projects.",
        explanation: "The strong summary proves capability using PMP credentials, budget scale, and hard on-time delivery metrics."
      }
    ],
    bulletGuidance: "Use the formula: Action Verb + Project Scope/Budget + Methodology/Tool + Quantifiable Result. Example: 'Reduced project delivery bottlenecks by 30% through the implementation of Jira automation workflows and standardized sprint retrospectives.'",
    expertQuote: "I look for three things in a PM resume: budget size managed, methodologies used, and evidence that the candidate actually delivers projects on time without burn-out.",
    faq: [
      {
        q: "Is PMP certification mandatory for Project Managers?",
        a: "While not mandatory for all PM roles (especially in startup or tech environments where CSM/Agile is common), PMP certification significantly boosts callback rates in enterprise, finance, construction, and healthcare industries."
      },
      {
        q: "How should I list project tools on my resume?",
        a: "Group your tools in your Skills section (e.g., 'PM Tools: Jira, Confluence, MS Project, Smartsheet') and reference how you used them in your experience bullet points."
      }
    ],
    relatedRoles: [
      { title: "Program Manager", slug: "program-manager" },
      { title: "Scrum Master", slug: "scrum-master" },
      { title: "Product Manager", slug: "product-manager" },
      { title: "Operations Manager", slug: "operations-manager" }
    ]
  }
};
