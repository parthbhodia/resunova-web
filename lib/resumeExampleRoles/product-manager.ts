import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const productManagerData: RolePageData = {
  slug: "product-manager",
  title: "Product Manager",
  category: "Product Management",
  pageTitle: "5 Product Manager Resume Examples & Tips for 2025",
  metaDescription: "Browse professionally written product manager resume examples. Discover what skills to include, how to structure your experience, and get expert tips to land more interviews.",
  
  marketInsights: {
    medianSalary: "$130,000 – $170,000",
    education: "Bachelor's or Master's degree",
    yearsExperience: "3–8 years",
    workStyle: "Hybrid / Remote",
    careerPath: "APM → PM → Senior PM → Director of Product",
    certifications: ["CSPO", "Pragmatic Institute (PMC-I)", "SAFe Agilist"],
  },

  examples: [
    {
      id: "pm-senior",
      persona: {
        name: "Ananya Sharma",
        location: "Bangalore, India",
        email: "ananya.sharma@email.com",
      },
      headline: "Senior Product Manager",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Ananya Sharma", 
          email: "ananya.sharma@email.com", 
          phone: "+91 98765 43210", 
          location: "Bangalore, India", 
          website: "ananya.pm", 
          linkedin: "linkedin.com/in/ananyasharma", 
          github: "github.com/ananyaprod", 
          summary: "Senior PM with 7+ years driving B2B SaaS products from concept to scale, specializing in fintech platforms serving 2M+ users. Proven track record of aligning engineering, design, and GTM teams to launch revenue-generating features. Passionate about creating seamless user experiences powered by complex financial infrastructures."
        },
        workExperiences: [
          { 
            id: "we-1", 
            company: "PayEase Technologies", 
            jobTitle: "Senior Product Manager", 
            location: "Bangalore, India", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Led a cross-functional team of 12 (engineers, designers, data scientists) to launch a merchant payment gateway, growing GMV by 340% in 18 months.\nDefined the product roadmap for a new lending vertical, achieving $8M ARR within the first year of launch.\nReduced customer onboarding time from 5 days to 4 hours by automating KYC verification workflows with third-party APIs.\nInstituted continuous discovery habits, conducting bi-weekly customer interviews to inform backlog prioritization." 
          },
          { 
            id: "we-2", 
            company: "CloudNine Retail", 
            jobTitle: "Product Manager", 
            location: "Mumbai, India", 
            startDate: "Jan 2018", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Owned the core inventory management module used by 500+ enterprise retail clients.\nRan comprehensive A/B testing on the checkout flow, improving overall conversion rates by 22% and reducing cart abandonment.\nCollaborated with product marketing to redesign the pricing tiers, resulting in a 15% increase in average revenue per user (ARPU)." 
          }
        ],
        educations: [
          { 
            id: "ed-1", 
            school: "Indian Institute of Management Ahmedabad", 
            degree: "MBA, Marketing & Strategy", 
            location: "Ahmedabad, India", 
            startDate: "Jun 2016", 
            endDate: "May 2018", 
            gpa: "3.9", 
            coursework: "Product Strategy, Consumer Behavior, Financial Modeling, Tech Entrepreneurship" 
          }
        ],
        projects: [
          {
            id: "proj-1",
            name: "SaaS Metrics Dashboard",
            tech: "Figma, SQL, Metabase",
            link: "ananya.pm/saas-dashboard",
            date: "2023",
            bullets: "Designed an open-source analytics dashboard template for early-stage B2B startups to track MRR, Churn, and CAC.\nAdopted by over 50 startups in the local incubator network."
          },
          {
            id: "proj-2",
            name: "Fintech API Documentation",
            tech: "Markdown, Stoplight",
            link: "ananya.pm/api-docs",
            date: "2022",
            bullets: "Led the restructuring of developer documentation for a mock payment API, reducing developer integration time by 40%."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Product Strategy", rating: 5 },
            { skill: "SQL", rating: 4 },
            { skill: "A/B Testing", rating: 5 },
            { skill: "Agile/Scrum", rating: 4 },
            { skill: "Data Analysis", rating: 4 },
            { skill: "Jira", rating: 5 }
          ],
          descriptions: "Product Management: Product Strategy, Roadmap Planning, A/B Testing, User Research, OKRs, Go-to-Market Strategy\nTechnical & Tools: SQL, Python (Basic), Jira, Figma, Mixpanel, Amplitude, Metabase\nMethodologies: Agile, Scrum, Continuous Discovery, Kanban"
        }
      },
      critique: "This resume stands out because it leads with quantifiable business impact. Highlighting metrics like '$8M ARR' and '340% GMV growth' immediately signals to a hiring manager that this PM understands revenue, not just feature shipping. The skills section is well-tailored for B2B SaaS."
    },
    {
      id: "pm-growth",
      persona: {
        name: "Marcus Chen",
        location: "San Francisco, CA",
        email: "marcus.chen@email.com",
      },
      headline: "Product Manager, Growth",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Marcus Chen", 
          email: "marcus.chen@email.com", 
          phone: "(415) 555-8822", 
          location: "San Francisco, CA", 
          website: "marcusgrowth.com", 
          linkedin: "linkedin.com/in/marcuschengrowth", 
          github: "github.com/marcuschen", 
          summary: "Growth-focused Product Manager with a background in data science, passionate about using experimentation to unlock user acquisition and retention. Scaled multiple consumer apps to millions of active users by bridging the gap between product strategy and deep behavioral analytics."
        },
        workExperiences: [
          { 
            id: "we-3", 
            company: "Streamly Inc.", 
            jobTitle: "Product Manager, Growth", 
            location: "San Francisco, CA", 
            startDate: "Sep 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Built a viral referral program that drove 45% of all new user signups within 6 months of launch.\nPartnered with the data science team to build a machine learning churn-prediction model, successfully cutting overall churn by 15%.\nManaged a $2M experimentation budget across 30+ concurrent A/B tests spanning onboarding, paywalls, and email flows.\nIncreased Day 1 retention by 20% by overhauling the first-time user experience (FTUE) based on Mixpanel funnel analysis." 
          },
          { 
            id: "we-4", 
            company: "DataForge Analytics", 
            jobTitle: "Associate Product Manager", 
            location: "San Jose, CA", 
            startDate: "Jul 2019", 
            endDate: "Aug 2022", 
            current: false, 
            bullets: "Launched a self-serve onboarding flow for enterprise clients, reducing support tickets by 30% and accelerating time-to-value.\nCollaborated directly with engineering to migrate a legacy analytics dashboard to React, improving perceived load speed by 60%.\nWrote complex SQL queries to uncover drop-off points in the activation funnel, resulting in a targeted UI update that lifted activation by 12%." 
          }
        ],
        educations: [
          { 
            id: "ed-2", 
            school: "University of California, Berkeley", 
            degree: "B.S. Data Science", 
            location: "Berkeley, CA", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.75", 
            coursework: "Probability & Statistics, Data Structures, Machine Learning, Behavioral Economics" 
          }
        ],
        projects: [
          {
            id: "proj-3",
            name: "Growth Experiments Tracker",
            tech: "React, Firebase, Tailwind",
            link: "marcusgrowth.com/tracker",
            date: "2023",
            bullets: "Developed an internal tool for PMs to log, track, and analyze A/B test results across multiple squads.\nScaled tool adoption to 4 product teams across the organization."
          },
          {
            id: "proj-4",
            name: "User Behavior Insights Bot",
            tech: "Python, Slack API",
            link: "github.com/marcuschen/slackbot",
            date: "2021",
            bullets: "Built a Slack bot that automatically pings product channels with weekly KPI summaries from Amplitude."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Growth Strategy", rating: 5 },
            { skill: "Experimentation", rating: 5 },
            { skill: "Mixpanel", rating: 5 },
            { skill: "Python", rating: 4 },
            { skill: "SQL", rating: 4 },
            { skill: "User Retention", rating: 4 }
          ],
          descriptions: "Growth & Analytics: A/B Testing, Funnel Optimization, Retention Strategies, Cohort Analysis, Viral Loops\nTools: Mixpanel, Amplitude, Optimizely, SQL, Python, Tableau\nProduct Management: Wireframing (Figma), User Interviews, Agile/Scrum, Stakeholder Management"
        }
      },
      critique: "Growth PM resumes need to demonstrate a deep understanding of data and experimentation. This resume does a fantastic job of showing cross-functional collaboration ('Partnered with data science') alongside hard numbers. The inclusion of Python and Mixpanel in the skills section aligns perfectly with a growth role's technical requirements."
    },
    {
      id: "pm-technical",
      persona: {
        name: "David Kim",
        location: "Seattle, WA",
        email: "david.kim@email.com",
      },
      headline: "Technical Product Manager",
      resumeData: {
        customization: { font: "Courier", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "David Kim", 
          email: "david.kim@email.com", 
          phone: "(206) 555-0199", 
          location: "Seattle, WA", 
          website: "davidkim.tech", 
          linkedin: "linkedin.com/in/davidkimtpm", 
          github: "github.com/dkim-tpm", 
          summary: "Technical Product Manager with a BS in Computer Science and 5 years of software engineering experience before transitioning to product. Expert in translating complex technical constraints into clear product requirements. Specialized in developer platforms, API design, and cloud infrastructure optimization."
        },
        workExperiences: [
          { 
            id: "we-5", 
            company: "NexaCloud Infrastructure", 
            jobTitle: "Technical Product Manager", 
            location: "Seattle, WA", 
            startDate: "Oct 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Spearheaded the launch of a new serverless computing product, capturing $12M in ARR within the first year.\nAuthored detailed technical PRDs and RFCs for the platform engineering team, streamlining API design and reducing integration bugs by 25%.\nOrchestrated a massive legacy database migration to a distributed NoSQL architecture with zero downtime, unlocking 10x scale for enterprise clients.\nDefined and monitored strict SLA and SLO metrics (99.99% uptime) in Datadog, leading quarterly operational review meetings with the VP of Engineering." 
          },
          { 
            id: "we-6", 
            company: "Pioneer Software", 
            jobTitle: "Software Engineer → Product Owner", 
            location: "Bellevue, WA", 
            startDate: "Jun 2016", 
            endDate: "Sep 2020", 
            current: false, 
            bullets: "Started as a backend engineer building RESTful microservices in Java/Spring Boot, before transitioning to a Product Owner role in 2018.\nLed a squad of 6 engineers to rewrite the legacy authentication service using OAuth 2.0 and JWTs, reducing login latency by 1.2 seconds.\nPrioritized the technical debt backlog, successfully lobbying stakeholders to dedicate 20% of sprint capacity to refactoring, which halved critical production incidents." 
          }
        ],
        educations: [
          { 
            id: "ed-3", 
            school: "University of Washington", 
            degree: "B.S. Computer Science", 
            location: "Seattle, WA", 
            startDate: "Sep 2012", 
            endDate: "Jun 2016", 
            gpa: "3.8", 
            coursework: "Distributed Systems, Database Design, Operating Systems, Software Engineering" 
          }
        ],
        projects: [
          {
            id: "proj-5",
            name: "API Latency Monitor",
            tech: "Go, Prometheus, Grafana",
            link: "github.com/dkim-tpm/latency-monitor",
            date: "2023",
            bullets: "Built a lightweight open-source service in Go to continuously ping external APIs and visualize response times in Grafana.\nGarnered 400+ stars on GitHub and contributions from 12 developers."
          },
          {
            id: "proj-6",
            name: "Cloud Cost Optimizer CLI",
            tech: "Python, AWS Boto3",
            link: "davidkim.tech/cost-cli",
            date: "2021",
            bullets: "Developed a CLI tool that analyzes AWS accounts for idle resources and outputs a cost-savings report, saving a previous employer $4,000/month."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "API Design", rating: 5 },
            { skill: "Cloud Architecture", rating: 5 },
            { skill: "System Design", rating: 4 },
            { skill: "Go / Java", rating: 4 },
            { skill: "Kubernetes", rating: 4 },
            { skill: "Datadog", rating: 4 }
          ],
          descriptions: "Technical Skills: System Design, RESTful / GraphQL API Design, Microservices, Cloud (AWS, GCP), Docker, Kubernetes\nProgramming Languages: Go, Java, Python, SQL\nProduct Tools: Postman, Datadog, Grafana, Swagger/OpenAPI, Jira, Confluence"
        }
      },
      critique: "This resume effectively showcases how a background in engineering serves a TPM role. The focus on system design, SLAs, and technical PRDs directly addresses the needs of technical teams, while the quantification of impact ('$12M ARR', 'zero downtime') proves business value."
    }
  ],

  writingGuide: {
    intro: "Writing a Product Manager resume requires you to treat your resume like a product. Your users are recruiters and hiring managers; your core features are your business impact, leadership, and technical fluency. Focus on outcomes over output, and back up your claims with hard data.",
    tips: [
      "Quantify your impact using metrics like ARR, GMV, conversion rates, or customer retention.",
      "Highlight cross-functional collaboration. Show how you worked with engineering, design, and marketing to ship features.",
      "Use strong action verbs like 'Led', 'Shipped', 'Spearheaded', and 'Scaled' instead of 'Responsible for' or 'Helped'.",
      "Tailor your skills section to the specific PM role (e.g., SQL and Mixpanel for Growth PMs; Jira and Agile for Technical PMs)."
    ],
    headlineExamples: [
      {
        strong: "Senior Product Manager | Fintech & B2B SaaS | Drove $10M+ ARR",
        weak: "Product Manager",
        explanation: "A strong headline gives the recruiter immediate context about your seniority, domain expertise, and scale of impact."
      },
      {
        strong: "Growth PM | Experimentation & Retention | 3x User Acquisition",
        weak: "Experienced Product Manager looking for new opportunities",
        explanation: "Focus on your specialty and actual results rather than generic objective statements."
      }
    ],
    summaryExamples: [
      {
        strong: "Data-driven Product Manager with 5+ years scaling consumer marketplaces. Led a team of 8 engineers and 2 designers to launch a native mobile app, resulting in a 40% increase in weekly active users. Adept at turning complex user research into actionable roadmaps.",
        weak: "Dedicated and hardworking professional with experience in product management. Good at working with teams and managing projects from start to finish. Looking to join a forward-thinking company.",
        explanation: "The strong example uses specific numbers, mentions cross-functional team size, and highlights a concrete achievement."
      }
    ],
    bulletGuidance: "The best PM resume bullets follow the 'Accomplished [X] as measured by [Y], by doing [Z]' format. Hiring managers want to see that you understand the 'why' behind the features you shipped, not just that you managed a backlog.",
    expertQuote: "When I review PM resumes, I'm looking for evidence that this person can herd cats. Can they align stakeholders, make tough trade-offs, and actually deliver value? A list of Jira tickets won't tell me that; measurable business outcomes will.",
    faq: [
      {
        q: "Should I include a portfolio link on my PM resume?",
        a: "Yes, if you have one! Linking to a portfolio with PRDs, wireframes, or case studies of products you've launched is a great way to show your work rather than just telling."
      },
      {
        q: "How technical does my resume need to be?",
        a: "It depends on the role. For a Technical Product Manager (TPM), you should list specific APIs, system architecture experience, and coding languages. For a general PM, knowing SQL and basic system design is usually enough."
      },
      {
        q: "How many pages should my PM resume be?",
        a: "Keep it to one page if you have less than 7-10 years of experience. Recruiters scan resumes in seconds; a concise, well-structured single page is always more effective than a diluted two-page resume."
      }
    ],
    relatedRoles: [
      { title: "Project Manager", slug: "project-manager" },
      { title: "Product Marketing Manager", slug: "product-marketing-manager" },
      { title: "Scrum Master", slug: "scrum-master" },
      { title: "Data Analyst", slug: "data-analyst" }
    ]
  }
};
