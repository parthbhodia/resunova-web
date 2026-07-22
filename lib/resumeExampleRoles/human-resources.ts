import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const humanResourcesData: RolePageData = {
  slug: "human-resources",
  title: "HR Specialist",
  category: "Human Resources",
  pageTitle: "5 Human Resources (HR) Resume Examples for 2025",
  metaDescription: "Browse professionally written HR resume examples. Learn how to highlight talent acquisition, employee retention, HRIS systems, and SHRM certifications.",
  
  marketInsights: {
    medianSalary: "$65,000 – $115,000",
    education: "Bachelor's degree in HR, Business, or Psychology",
    yearsExperience: "2–8+ years",
    workStyle: "Hybrid / In-Office",
    careerPath: "HR Coordinator → HR Generalist → HR Manager → Director of HR → VP of People",
    certifications: ["SHRM-CP / SHRM-SCP", "PHR / SPHR (HRCI)"],
  },

  examples: [
    {
      id: "hr-manager",
      persona: {
        name: "Samantha Wright",
        location: "Chicago, IL",
        email: "samantha.wright@email.com",
      },
      headline: "Human Resources Manager (SHRM-CP)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#d97706", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Samantha Wright", 
          email: "samantha.wright@email.com", 
          phone: "(312) 555-0155", 
          location: "Chicago, IL", 
          website: "", 
          linkedin: "linkedin.com/in/samanthawright-hr", 
          github: "", 
          summary: "SHRM-CP certified HR Manager with 7+ years of experience leading employee relations, talent acquisition, and HRIS implementations for 400+ employee organizations. Reduced voluntary turnover by 22% through engagement initiatives and revamped performance management processes."
        },
        workExperiences: [
          { 
            id: "hr-we-1", 
            company: "Apex Global Solutions", 
            jobTitle: "Human Resources Manager", 
            location: "Chicago, IL", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Oversee end-to-end HR operations for 450 corporate employees, managing a team of 4 HR specialists.\nReduced annual turnover from 24% to 14% by designing a comprehensive employee wellness and recognition framework.\nLed migration to Workday HRIS, streamlining payroll processing and benefits enrollment for all staff." 
          },
          { 
            id: "hr-we-2", 
            company: "Midwest Logistics Inc", 
            jobTitle: "HR Generalist", 
            location: "Chicago, IL", 
            startDate: "Jun 2017", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Managed full-lifecycle recruiting for 80+ open positions annually across sales, ops, and engineering.\nResolved complex employee relations issues and conducted internal workplace investigations in compliance with EEOC laws." 
          }
        ],
        educations: [
          { 
            id: "hr-ed-1", 
            school: "University of Illinois Urbana-Champaign", 
            degree: "B.S. Human Resources & Industrial Relations", 
            location: "Champaign, IL", 
            startDate: "Sep 2013", 
            endDate: "May 2017", 
            gpa: "3.75", 
            coursework: "Employment Law, Organizational Behavior, Compensation & Benefits, Labor Relations" 
          }
        ],
        projects: [
          {
            id: "hr-proj-1",
            name: "Workday HRIS Implementation",
            tech: "Workday, BambooHR",
            link: "",
            date: "2022",
            bullets: "Spearheaded 6-month enterprise Workday deployment on-time and under budget."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "SHRM-CP Certified", rating: 5 },
            { skill: "HRIS Systems (Workday / BambooHR)", rating: 5 },
            { skill: "Employee Relations & Compliance", rating: 5 },
            { skill: "Talent Acquisition & Onboarding", rating: 4 },
            { skill: "Performance Management", rating: 5 },
            { skill: "Benefits & Payroll Admin", rating: 4 }
          ],
          descriptions: "Certifications: SHRM-CP (Society for Human Resource Management)\nSystems: Workday, BambooHR, ADP TotalSource, Greenhouse, Lever, SAP SuccessFactors\nCompetencies: Employee Relations, EEOC Compliance, Retention Strategies, Talent Acquisition, Compensation Structuring"
        }
      },
      critique: "A standout HR Manager resume showing headcount scale (450 employees), HRIS implementation expertise, and clear retention metrics (24% to 14% turnover reduction)."
    },
    {
      id: "hr-tech-recruiter",
      persona: {
        name: "Devon Miller",
        location: "San Francisco, CA",
        email: "devon.miller@email.com",
      },
      headline: "Senior Technical Recruiter",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Devon Miller", 
          email: "devon.miller@email.com", 
          phone: "(415) 555-0193", 
          location: "San Francisco, CA", 
          website: "", 
          linkedin: "linkedin.com/in/devonmiller-recruiter", 
          github: "", 
          summary: "Senior Technical Recruiter with 5+ years of experience sourcing, interviewing, and closing specialized software engineering and AI/ML talent for high-growth tech scaleups. Placed 95+ senior engineers annually with an average offer acceptance rate of 88% and time-to-fill under 35 days."
        },
        workExperiences: [
          { 
            id: "hr-we-3", 
            company: "ScaleTech AI", 
            jobTitle: "Senior Technical Recruiter", 
            location: "San Francisco, CA", 
            startDate: "Jan 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Lead full-cycle technical recruiting for Engineering, Product, and Data Science teams, filling 60+ complex technical roles per year.\nMaintained an 88% candidate offer acceptance rate by partnering closely with hiring managers to build competitive compensation packages.\nReduced average time-to-fill from 52 days to 34 days through proactive talent pipeline building in LinkedIn Recruiter and Gem." 
          },
          { 
            id: "hr-we-4", 
            company: "TalentPoint Search Agency", 
            jobTitle: "Technical Recruiter", 
            location: "San Francisco, CA", 
            startDate: "Aug 2018", 
            endDate: "Dec 2021", 
            current: false, 
            bullets: "Sourced and screened engineering candidates for Series A through C startups using Greenhouse ATS, LinkedIn Recruiter, and GitHub." 
          }
        ],
        educations: [
          { 
            id: "hr-ed-2", 
            school: "University of California, Berkeley", 
            degree: "B.A. Psychology", 
            location: "Berkeley, CA", 
            startDate: "Aug 2014", 
            endDate: "May 2018", 
            gpa: "3.7", 
            coursework: "Industrial Psychology, Research Methods, Negotiation, Social Psychology" 
          }
        ],
        projects: [
          {
            id: "hr-proj-2",
            name: "Engineering Diversity Hiring Program",
            tech: "Greenhouse, Gem, LinkedIn Recruiter",
            link: "",
            date: "2023",
            bullets: "Designed outbound sourcing strategy that increased underrepresented minority hires in engineering by 35%."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Technical Sourcing & Recruiting", rating: 5 },
            { skill: "LinkedIn Recruiter / Gem", rating: 5 },
            { skill: "Greenhouse / Lever ATS", rating: 5 },
            { skill: "Offer Negotiation & Closing", rating: 5 },
            { skill: "Time-to-Fill & Metric Tracking", rating: 4 },
            { skill: "Diversity & Inclusion Hiring", rating: 4 }
          ],
          descriptions: "ATS & Sourcing: Greenhouse, Lever, LinkedIn Recruiter, Gem, Entelo, HackerRank, Calendly\nRecruiting Metrics: Offer Acceptance Rate (88%), Time-to-Fill (34 days), Candidate NPS, Cost-per-Hire"
        }
      },
      critique: "A modern, sleek technical recruiter resume built on the Onyx preset. Highlights talent metrics (95+ hires/yr, 88% acceptance rate, 34-day time-to-fill) and specialized ATS software."
    },
    {
      id: "hr-people-ops",
      persona: {
        name: "Elena Rostova-Smith",
        location: "Austin, TX",
        email: "elena.smith@email.com",
      },
      headline: "People Operations & Culture Lead",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Elena Rostova-Smith", 
          email: "elena.smith@email.com", 
          phone: "(512) 555-0144", 
          location: "Austin, TX", 
          website: "", 
          linkedin: "linkedin.com/in/elenasmith-peopleops", 
          github: "", 
          summary: "People Operations Lead with 5+ years of experience crafting remote-first onboarding experiences, compensation benchmarking, and employee engagement strategies. Increased eNPS score from +18 to +54 and streamlined new hire onboarding for 200+ remote employees."
        },
        workExperiences: [
          { 
            id: "hr-we-5", 
            company: "RemoteWorks Inc", 
            jobTitle: "People Operations Lead", 
            location: "Austin, TX", 
            startDate: "Sep 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Redesigned automated 30-60-90 day onboarding workflow in Rippling, elevating new hire 90-day retention to 96%.\nManaged annual employee engagement survey process in Culture Amp, boosting overall eNPS score from +18 to +54.\nPartnered with Finance to establish equitable remote salary bands using Radford compensation benchmarking data." 
          }
        ],
        educations: [
          { 
            id: "hr-ed-3", 
            school: "University of Texas at Austin", 
            degree: "B.S. Corporate Communications", 
            location: "Austin, TX", 
            startDate: "Aug 2014", 
            endDate: "May 2018", 
            gpa: "3.8", 
            coursework: "Organizational Communication, Conflict Resolution, Human Resource Strategy" 
          }
        ],
        projects: [
          {
            id: "hr-proj-3",
            name: "Rippling HRIS & IT Provisioning Rollout",
            tech: "Rippling, Culture Amp, Lattice",
            link: "",
            date: "2022",
            bullets: "Automated hardware laptop shipping and app provisioning, saving 15 manual IT/HR hours per week."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "People Operations & Culture", rating: 5 },
            { skill: "Rippling & Gusto HRIS", rating: 5 },
            { skill: "Culture Amp (eNPS Tracking)", rating: 5 },
            { skill: "Lattice Performance Reviews", rating: 4 },
            { skill: "Compensation Benchmarking", rating: 4 },
            { skill: "Remote Onboarding Automation", rating: 5 }
          ],
          descriptions: "Platforms: Rippling, Culture Amp, Lattice, Gusto, Radford Benchmarking, Notion, Slack\nFocus Areas: Remote Culture, eNPS Growth (+54), Automated Onboarding, Performance Review Cycles, Salary Bands"
        }
      },
      critique: "A clean modern People Ops resume highlighting remote-first onboarding, eNPS metrics (+54), Rippling automation, and compensation benchmarking."
    }
  ],

  writingGuide: {
    intro: "An effective HR resume demonstrates balance between compliance/risk management and strategic talent enablement. Quantify workforce size, turnover reductions, and time-to-hire metrics.",
    tips: [
      "Quantify employee headcount supported (e.g., 'Supported 500+ employees across 4 offices').",
      "List specific HRIS platforms (Workday, ADP, BambooHR, Greenhouse).",
      "Highlight SHRM-CP or PHR certifications in headline and summary."
    ],
    headlineExamples: [
      {
        strong: "Human Resources Manager | SHRM-CP | Talent Acquisition & Workday HRIS (500+ Staff)",
        weak: "HR Professional looking for new opportunity",
        explanation: "Shows certification, core systems, and employee headcount supported."
      }
    ],
    summaryExamples: [
      {
        strong: "SHRM-CP certified HR Manager with 7+ years of experience supporting 450+ employees. Reduced voluntary turnover by 22% and implemented Workday HRIS on time.",
        weak: "Friendly HR specialist who loves helping people and building company culture.",
        explanation: "Replaces soft claims with hard retention metrics and system implementations."
      }
    ],
    bulletGuidance: "Use: HR Action + Headcount/System + Result. Example: 'Reduced annual turnover from 24% to 14% by designing a comprehensive employee wellness framework.'",
    expertQuote: "HR resumes must prove business value. Show me how your people strategies saved cost or improved retention.",
    faq: [
      {
        q: "Is SHRM-CP better than PHR?",
        a: "Both are highly respected; SHRM-CP is currently more widely requested in job listings."
      }
    ],
    relatedRoles: [
      { title: "Talent Acquisition Specialist", slug: "talent-acquisition-specialist" },
      { title: "HR Business Partner (HRBP)", slug: "hrbp" },
      { title: "People Operations Manager", slug: "people-ops-manager" }
    ]
  }
};
