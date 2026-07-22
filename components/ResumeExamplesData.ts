import { TBResumeData, DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const RESUME_EXAMPLES_DATA = [
  {
    title: "Senior Product Manager",
    category: "Product Management",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Senior PM with 7+ years driving B2B SaaS products from concept to scale, specializing in fintech platforms serving 2M+ users.",
    score: 95,
    tags: ["Product Strategy", "SQL", "Roadmapping"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Ananya Sharma", email: "ananya.sharma@email.com", phone: "", location: "Bangalore, India", website: "", linkedin: "", github: "", summary: "Senior PM with 7+ years driving B2B SaaS products from concept to scale, specializing in fintech platforms serving 2M+ users."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "PayEase Technologies", jobTitle: "Senior Product Manager", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Led cross-functional team of 12 to launch merchant payment gateway, growing GMV by 340% in 18 months\nDefined product roadmap for lending vertical, resulting in $8M ARR within first year\nReduced customer onboarding time from 5 days to 4 hours via workflow automation" },
        { id: crypto.randomUUID(), company: "CloudNine Retail", jobTitle: "Product Manager", location: "", startDate: "2018", endDate: "2021", current: false, bullets: "Owned inventory management module used by 500+ enterprise clients\nRan A/B tests that improved checkout conversion by 22%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "IIM Ahmedabad", degree: "MBA, Marketing", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Product Strategy", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Roadmapping", rating: 4 },
          { skill: "A/B Testing", rating: 4 },
          { skill: "Agile/Scrum", rating: 4 },
          { skill: "Jira", rating: 4 }
        ],
        descriptions: "Core Competencies: Product Strategy, SQL, Roadmapping, A/B Testing, Agile/Scrum, Jira, Figma"
      }
    } as TBResumeData
  },
  {
    title: "Product Manager, Growth",
    category: "Product Management",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Growth-focused PM with a background in data science, passionate about using experimentation to unlock user acquisition and retention.",
    score: 92,
    tags: ["Growth Strategy", "Python", "Experimentation"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Marcus Chen", email: "marcus.chen@email.com", phone: "", location: "San Francisco, CA", website: "", linkedin: "", github: "", summary: "Growth-focused PM with a background in data science, passionate about using experimentation to unlock user acquisition and retention."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Streamly Inc.", jobTitle: "Product Manager, Growth", location: "", startDate: "2022", endDate: "Present", current: true, bullets: "Built referral program that drove 45% of new user signups\nPartnered with data science to build churn-prediction model, cutting churn by 15%\nManaged $2M experimentation budget across 30+ concurrent A/B tests" },
        { id: crypto.randomUUID(), company: "DataForge Analytics", jobTitle: "Associate Product Manager", location: "", startDate: "2019", endDate: "2022", current: false, bullets: "Launched self-serve onboarding flow, reducing support tickets by 30%\nCollaborated with engineering to migrate legacy dashboard to React, improving load speed by 60%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "UC Berkeley", degree: "B.S. Computer Science", location: "", startDate: "", endDate: "2019", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Growth Strategy", rating: 4 },
          { skill: "Python", rating: 4 },
          { skill: "Experimentation", rating: 4 },
          { skill: "Mixpanel", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Stakeholder Management", rating: 4 }
        ],
        descriptions: "Core Competencies: Growth Strategy, Python, Experimentation, Mixpanel, SQL, Stakeholder Management"
      }
    } as TBResumeData
  },
  {
    title: "Associate Product Manager",
    category: "Product Management",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Early-career PM transitioning from software engineering, focused on ed-tech products that improve learning outcomes for students.",
    score: 88,
    tags: ["Product Discovery", "User Research", "SQL"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Priya Deshmukh", email: "priya.deshmukh@email.com", phone: "", location: "Mumbai, India", website: "", linkedin: "", github: "", summary: "Early-career PM transitioning from software engineering, focused on ed-tech products that improve learning outcomes for students."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "LearnSphere", jobTitle: "Associate Product Manager", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Shipped adaptive quiz engine adopted by 50,000 students in first quarter\nWrote PRDs and coordinated sprints for a team of 6 engineers\nConducted 40+ user interviews to inform mobile app redesign" },
        { id: crypto.randomUUID(), company: "TechNova Solutions", jobTitle: "Software Engineer", location: "", startDate: "2021", endDate: "2023", current: false, bullets: "Built internal analytics dashboard used by product and sales teams\nContributed to backend APIs powering core learning platform" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "St. Francis Institute of Technology", degree: "B.Tech, Computer Engineering", location: "", startDate: "", endDate: "2021", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Product Discovery", rating: 4 },
          { skill: "User Research", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Figma", rating: 4 },
          { skill: "REST APIs", rating: 4 },
          { skill: "Notion", rating: 4 }
        ],
        descriptions: "Core Competencies: Product Discovery, User Research, SQL, Figma, REST APIs, Notion"
      }
    } as TBResumeData
  },
  {
    title: "Director of Product",
    category: "Product Management",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Product leader with 12+ years scaling consumer marketplaces, experienced in managing PM teams and setting company-wide product vision.",
    score: 98,
    tags: ["Product Vision", "Team Leadership", "OKRs"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "chikorita", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "James O'Connor", email: "james.oconnor@email.com", phone: "", location: "Austin, TX", website: "", linkedin: "", github: "", summary: "Product leader with 12+ years scaling consumer marketplaces, experienced in managing PM teams and setting company-wide product vision."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "HomeSwift Marketplace", jobTitle: "Director of Product", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Lead team of 8 PMs across search, trust & safety, and payments pods\nSet product vision that grew platform GMV from $50M to $310M in 4 years\nPresented quarterly roadmap and OKRs directly to board of directors" },
        { id: crypto.randomUUID(), company: "UrbanCart", jobTitle: "Group Product Manager", location: "", startDate: "2016", endDate: "2020", current: false, bullets: "Scaled logistics product suite supporting 200+ delivery partners\nMentored 5 PMs, 3 of whom were promoted to senior roles" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Texas at Austin", degree: "B.S. Industrial Engineering", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Product Vision", rating: 4 },
          { skill: "Team Leadership", rating: 4 },
          { skill: "OKRs", rating: 4 },
          { skill: "Marketplace Dynamics", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Executive Communication", rating: 4 }
        ],
        descriptions: "Core Competencies: Product Vision, Team Leadership, OKRs, Marketplace Dynamics, SQL, Executive Communication"
      }
    } as TBResumeData
  },
  {
    title: "Product Manager, AI/ML",
    category: "Product Management",
    level: "Mid Level",
    levelColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    desc: "PM with technical depth in machine learning products, bridging data science and engineering teams to ship responsible AI features.",
    score: 94,
    tags: ["Machine Learning", "Product Strategy", "Python"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "ditgar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Fatima Al-Sayed", email: "fatima.alsayed@email.com", phone: "", location: "Dubai, UAE", website: "", linkedin: "", github: "", summary: "PM with technical depth in machine learning products, bridging data science and engineering teams to ship responsible AI features."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Vantix AI", jobTitle: "Product Manager, AI/ML", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Launched recommendation engine that increased user engagement by 28%\nDefined evaluation metrics and guardrails for LLM-based customer support feature\nPartnered with legal and trust teams to ensure model outputs met regional compliance standards" },
        { id: crypto.randomUUID(), company: "Nimbus Cloud Services", jobTitle: "Technical Product Manager", location: "", startDate: "2018", endDate: "2021", current: false, bullets: "Managed API product used by 1,200+ developers\nReduced API latency by 35% through prioritized infrastructure roadmap" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "American University of Sharjah", degree: "M.S. Data Science", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Machine Learning", rating: 4 },
          { skill: "Product Strategy", rating: 4 },
          { skill: "Python", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "A/B Testing", rating: 4 },
          { skill: "Cross-functional Leadership", rating: 4 }
        ],
        descriptions: "Core Competencies: Machine Learning, Product Strategy, Python, SQL, A/B Testing, Cross-functional Leadership"
      }
    } as TBResumeData
  },
  {
    title: "Entry Level Software Engineer",
    category: "Software Engineering",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Entry-level Software Engineer with a strong foundation in full-stack development. Proficient in Python, JavaScript, and cloud basics, with a track record of shipping clean, tested code during internships.",
    score: 87,
    tags: ["Python", "JavaScript", "React"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "ditto", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Rohan Verma", email: "rohan.verma@email.com", phone: "", location: "Pune, India", website: "", linkedin: "", github: "", summary: "Entry-level Software Engineer with a strong foundation in full-stack development. Proficient in Python, JavaScript, and cloud basics, with a track record of shipping clean, tested code during internships."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Nexbyte Solutions", jobTitle: "Software Engineer Intern", location: "", startDate: "2024", endDate: "2025", current: false, bullets: "Built REST API endpoints for internal tooling, cutting manual report generation time by 60%\nWrote unit tests raising code coverage on core module from 45% to 82%\nPaired with senior engineers to debug production incidents during on-call shadowing" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Pune Institute of Computer Technology", degree: "B.Tech, Computer Engineering", location: "", startDate: "", endDate: "2025", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Python", rating: 4 },
          { skill: "JavaScript", rating: 4 },
          { skill: "React", rating: 4 },
          { skill: "Git", rating: 4 },
          { skill: "REST APIs", rating: 4 },
          { skill: "SQL", rating: 4 }
        ],
        descriptions: "Core Competencies: Python, JavaScript, React, Git, REST APIs, SQL, Docker"
      }
    } as TBResumeData
  },
  {
    title: "Software Engineer",
    category: "Software Engineering",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Full-stack Software Engineer with 6 years of experience building scalable web applications. Skilled in translating product requirements into performant, maintainable systems.",
    score: 93,
    tags: ["Java", "TypeScript", "Node.js"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "gengar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Emily Zhang", email: "emily.zhang@email.com", phone: "", location: "Seattle, WA", website: "", linkedin: "", github: "", summary: "Full-stack Software Engineer with 6 years of experience building scalable web applications. Skilled in translating product requirements into performant, maintainable systems."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Northline Software", jobTitle: "Software Engineer", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Led development of customer notification service handling 5M+ events/day with 99.95% uptime\nMigrated monolith checkout flow to microservices, reducing page load time by 45%\nMentored 2 junior engineers and led weekly code review sessions" },
        { id: crypto.randomUUID(), company: "Brightpath Apps", jobTitle: "Junior Software Engineer", location: "", startDate: "2019", endDate: "2021", current: false, bullets: "Developed mobile app features used by 200,000+ monthly active users\nReduced crash rate by 30% through improved error handling and monitoring" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Washington", degree: "B.S. Computer Science", location: "", startDate: "", endDate: "2019", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Java", rating: 4 },
          { skill: "TypeScript", rating: 4 },
          { skill: "Node.js", rating: 4 },
          { skill: "AWS", rating: 4 },
          { skill: "Kubernetes", rating: 4 },
          { skill: "PostgreSQL", rating: 4 }
        ],
        descriptions: "Core Competencies: Java, TypeScript, Node.js, AWS, Kubernetes, PostgreSQL, CI/CD"
      }
    } as TBResumeData
  },
  {
    title: "Senior Software Engineer",
    category: "Software Engineering",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Senior Software Engineer with 10+ years of experience architecting cloud-native, distributed systems. Focused on scalability, reliability, and mentoring engineering teams.",
    score: 96,
    tags: ["Go", "Python", "Kafka"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "glalie", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Diego Fernandez", email: "diego.fernandez@email.com", phone: "", location: "Austin, TX", website: "", linkedin: "", github: "", summary: "Senior Software Engineer with 10+ years of experience architecting cloud-native, distributed systems. Focused on scalability, reliability, and mentoring engineering teams."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Vector Cloud Systems", jobTitle: "Senior Software Engineer", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Architected microservices platform processing 50M+ daily transactions across 3 regions\nReduced infrastructure costs by 35% through right-sizing and autoscaling improvements\nLed design reviews and set coding standards adopted across 4 engineering squads" },
        { id: crypto.randomUUID(), company: "ClearPath Data", jobTitle: "Software Engineer II", location: "", startDate: "2016", endDate: "2020", current: false, bullets: "Built real-time analytics pipeline processing 10TB+ of data daily using Kafka and Spark\nImproved API response times by 55% through caching and query optimization" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Texas at Austin", degree: "M.S. Computer Science", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Go", rating: 4 },
          { skill: "Python", rating: 4 },
          { skill: "Kafka", rating: 4 },
          { skill: "Kubernetes", rating: 4 },
          { skill: "GCP", rating: 4 },
          { skill: "System Design", rating: 4 }
        ],
        descriptions: "Core Competencies: Go, Python, Kafka, Kubernetes, GCP, System Design, gRPC"
      }
    } as TBResumeData
  },
  {
    title: "Staff Software Engineer",
    category: "Software Engineering",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Staff Software Engineer with 12+ years of experience in cloud-native architectures and AI/ML-driven systems. Known for driving technical strategy and reducing infrastructure cost at scale.",
    score: 98,
    tags: ["Distributed Systems", "Rust", "Kubernetes"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "kakuna", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Aditi Rao", email: "aditi.rao@email.com", phone: "", location: "Bangalore, India", website: "", linkedin: "", github: "", summary: "Staff Software Engineer with 12+ years of experience in cloud-native architectures and AI/ML-driven systems. Known for driving technical strategy and reducing infrastructure cost at scale."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Orbital Systems", jobTitle: "Staff Software Engineer", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Drove adoption of AI-powered code optimization tooling, cutting build times by 40% org-wide\nLed migration of legacy platform to cloud-native microservices, improving scalability 3x\nSet multi-year technical roadmap presented to VP of Engineering and senior leadership" },
        { id: crypto.randomUUID(), company: "Falconworks Tech", jobTitle: "Senior Software Engineer", location: "", startDate: "2014", endDate: "2019", current: false, bullets: "Designed distributed caching layer reducing database load by 50%\nMentored 8 engineers, 4 of whom were promoted to senior roles" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "IIT Kharagpur", degree: "B.Tech, Computer Science", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Distributed Systems", rating: 4 },
          { skill: "Rust", rating: 4 },
          { skill: "Kubernetes", rating: 4 },
          { skill: "Terraform", rating: 4 },
          { skill: "AI/ML Integration", rating: 4 },
          { skill: "System Architecture", rating: 4 }
        ],
        descriptions: "Core Competencies: Distributed Systems, Rust, Kubernetes, Terraform, AI/ML Integration, System Architecture"
      }
    } as TBResumeData
  },
  {
    title: "Software Testing Engineer",
    category: "Software Engineering",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "AI-driven Test Automation Specialist with 7 years of experience improving release quality and reducing defect leakage across web and mobile platforms.",
    score: 91,
    tags: ["Selenium", "Cypress", "Test Automation"],
    data: {
      customization: { font: "Helvetica", accentColor: "#a366ff", stylePreset: "lapras", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Sofia Kowalski", email: "sofia.kowalski@email.com", phone: "", location: "Chicago, IL", website: "", linkedin: "", github: "", summary: "AI-driven Test Automation Specialist with 7 years of experience improving release quality and reducing defect leakage across web and mobile platforms."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Precision QA Labs", jobTitle: "Software Testing Engineer", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Built automated regression suite achieving 98% defect detection rate pre-release\nReduced release cycle time by 40% by integrating tests into CI/CD pipeline\nPartnered with DevOps to implement zero-downtime deployment testing" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Illinois Institute of Technology", degree: "B.S. Information Technology", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Selenium", rating: 4 },
          { skill: "Cypress", rating: 4 },
          { skill: "Test Automation", rating: 4 },
          { skill: "CI/CD", rating: 4 },
          { skill: "Jira", rating: 4 },
          { skill: "API Testing", rating: 4 }
        ],
        descriptions: "Core Competencies: Selenium, Cypress, Test Automation, CI/CD, Jira, API Testing, Python"
      }
    } as TBResumeData
  },
  {
    title: "Sales Associate",
    category: "Sales",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Sales Associate with 4 years of experience driving retail sales and building strong customer relationships. Consistently exceeds targets through personalized product consultations.",
    score: 85,
    tags: ["Consultative Selling", "POS Systems", "Customer Retention"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "leafish", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Tyler Brooks", email: "tyler.brooks@email.com", phone: "", location: "Denver, CO", website: "", linkedin: "", github: "", summary: "Sales Associate with 4 years of experience driving retail sales and building strong customer relationships. Consistently exceeds targets through personalized product consultations."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Meridian Retail Group", jobTitle: "Sales Associate", location: "", startDate: "2022", endDate: "Present", current: true, bullets: "Exceeded annual sales target, achieving 128% of goal in 2025\nIncreased repeat customer visits by 35% through personalized follow-up outreach\nTrained 5 new hires on point-of-sale systems and consultative selling techniques" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Front Range Community College", degree: "Associate Degree, Business Administration", location: "", startDate: "", endDate: "2021", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Consultative Selling", rating: 4 },
          { skill: "POS Systems", rating: 4 },
          { skill: "Customer Retention", rating: 4 },
          { skill: "Product Knowledge", rating: 4 },
          { skill: "Upselling", rating: 4 },
          { skill: "Communication", rating: 4 }
        ],
        descriptions: "Core Competencies: Consultative Selling, POS Systems, Customer Retention, Product Knowledge, Upselling"
      }
    } as TBResumeData
  },
  {
    title: "Inside Sales Representative",
    category: "Sales",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Results-driven Inside Sales Representative with 6 years of experience in B2B SaaS sales. Skilled at qualifying leads, managing pipelines, and closing deals in fast-paced environments.",
    score: 90,
    tags: ["Salesforce", "Pipeline Management", "Cold Outreach"],
    data: {
      customization: { font: "Helvetica", accentColor: "#22c55e", stylePreset: "meowth", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Nia Robinson", email: "nia.robinson@email.com", phone: "", location: "Charlotte, NC", website: "", linkedin: "", github: "", summary: "Results-driven Inside Sales Representative with 6 years of experience in B2B SaaS sales. Skilled at qualifying leads, managing pipelines, and closing deals in fast-paced environments."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Corestack Software", jobTitle: "Inside Sales Representative", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Closed 52 new accounts in one year, contributing $680K in ARR\nExceeded quarterly quota by 22% for 6 consecutive quarters\nBuilt and managed pipeline of 150+ active opportunities using Salesforce" },
        { id: crypto.randomUUID(), company: "Brightline Solutions", jobTitle: "Sales Development Representative", location: "", startDate: "2019", endDate: "2021", current: false, bullets: "Generated 300+ qualified leads per quarter through targeted outbound campaigns\nAchieved top-performer status 4 quarters in a row" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of North Carolina at Charlotte", degree: "B.A. Communications", location: "", startDate: "", endDate: "2019", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Salesforce", rating: 4 },
          { skill: "Pipeline Management", rating: 4 },
          { skill: "Cold Outreach", rating: 4 },
          { skill: "Consultative Selling", rating: 4 },
          { skill: "Lead Qualification", rating: 4 },
          { skill: "B2B Sales", rating: 4 }
        ],
        descriptions: "Core Competencies: Salesforce, Pipeline Management, Cold Outreach, Consultative Selling, Lead Qualification"
      }
    } as TBResumeData
  },
  {
    title: "Account Executive",
    category: "Sales",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Account Executive with 8 years of experience closing complex B2B deals and growing enterprise accounts. Strong track record in consultative, relationship-driven sales.",
    score: 94,
    tags: ["Enterprise Sales", "Negotiation", "Account Management"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "pikachu", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Marco Silva", email: "marco.silva@email.com", phone: "", location: "Miami, FL", website: "", linkedin: "", github: "", summary: "Account Executive with 8 years of experience closing complex B2B deals and growing enterprise accounts. Strong track record in consultative, relationship-driven sales."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Vantage Cloud Solutions", jobTitle: "Account Executive", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Grew territory revenue from $1.2M to $3.5M over 3 years\nClosed largest deal in company history, a $450K multi-year enterprise contract\nMaintained 95% client retention rate across a portfolio of 40+ accounts" },
        { id: crypto.randomUUID(), company: "Summit Business Systems", jobTitle: "Sales Representative", location: "", startDate: "2017", endDate: "2020", current: false, bullets: "Ranked #2 out of 35 reps nationally for annual revenue generated\nExpanded existing accounts through upsells, adding $200K in incremental revenue" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Florida International University", degree: "B.S. Business Administration", location: "", startDate: "", endDate: "2017", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Enterprise Sales", rating: 4 },
          { skill: "Negotiation", rating: 4 },
          { skill: "Account Management", rating: 4 },
          { skill: "Salesforce", rating: 4 },
          { skill: "Solution Selling", rating: 4 },
          { skill: "B2B Sales", rating: 4 }
        ],
        descriptions: "Core Competencies: Enterprise Sales, Negotiation, Account Management, Salesforce, Solution Selling"
      }
    } as TBResumeData
  },
  {
    title: "Sales Manager",
    category: "Sales",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Sales Manager with 12 years of experience transforming underperforming teams into consistent revenue drivers. Specializes in coaching, territory planning, and building repeatable sales processes.",
    score: 96,
    tags: ["Team Leadership", "Sales Coaching", "Territory Planning"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "rhyhorn", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Kelsey Wagner", email: "kelsey.wagner@email.com", phone: "", location: "Minneapolis, MN", website: "", linkedin: "", github: "", summary: "Sales Manager with 12 years of experience transforming underperforming teams into consistent revenue drivers. Specializes in coaching, territory planning, and building repeatable sales processes."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Ironclad Distribution", jobTitle: "Sales Manager", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Grew regional revenue by 32% year-over-year while reducing customer acquisition costs\nCoached a team of 10 reps, with 6 promoted to senior roles under her leadership\nImplemented data-driven sales process that shortened average deal cycle by 25%" },
        { id: crypto.randomUUID(), company: "Palisade Group", jobTitle: "Senior Sales Representative", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Consistently ranked top 3 performer across a 25-person sales team\nBuilt key account relationships generating $1.8M in recurring annual revenue" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Minnesota", degree: "B.A. Marketing", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Team Leadership", rating: 4 },
          { skill: "Sales Coaching", rating: 4 },
          { skill: "Territory Planning", rating: 4 },
          { skill: "Forecasting", rating: 4 },
          { skill: "CRM Management", rating: 4 },
          { skill: "Strategic Planning", rating: 4 }
        ],
        descriptions: "Core Competencies: Team Leadership, Sales Coaching, Territory Planning, Forecasting, CRM Management"
      }
    } as TBResumeData
  },
  {
    title: "Regional Sales Director",
    category: "Sales",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Regional Sales Director with 15+ years of experience leading multi-state sales organizations. Proven ability to scale revenue, build high-performing teams, and set go-to-market strategy.",
    score: 99,
    tags: ["Sales Strategy", "P&L Management", "Team Building"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "scizor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Omar Haddad", email: "omar.haddad@email.com", phone: "", location: "Dallas, TX", website: "", linkedin: "", github: "", summary: "Regional Sales Director with 15+ years of experience leading multi-state sales organizations. Proven ability to scale revenue, build high-performing teams, and set go-to-market strategy."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Highpoint Industrial Group", jobTitle: "Regional Sales Director", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Scaled regional revenue from $18M to $47M across a 5-state territory in 5 years\nBuilt and led a team of 6 sales managers overseeing 45 total sales reps\nSet annual go-to-market strategy presented directly to executive leadership" },
        { id: crypto.randomUUID(), company: "Cascade Manufacturing Co.", jobTitle: "Senior Sales Manager", location: "", startDate: "2014", endDate: "2019", current: false, bullets: "Led team that grew from $6M to $15M in annual revenue over 4 years\nDeveloped onboarding program that cut new rep ramp time from 6 months to 3" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Southern Methodist University", degree: "MBA", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Sales Strategy", rating: 5 },
          { skill: "P&L Management", rating: 5 },
          { skill: "Team Building", rating: 5 },
          { skill: "Go-to-Market Planning", rating: 4 },
          { skill: "Executive Communication", rating: 5 },
          { skill: "Forecasting", rating: 4 }
        ],
        descriptions: "Core Competencies: Sales Strategy, P&L Management, Team Building, Go-to-Market Planning, Executive Communication"
      }
    } as TBResumeData
  },
  {
    title: "Entry Level Data Scientist",
    category: "Data Science",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Entry-level Data Scientist with a strong foundation in statistics, machine learning, and Python. Experienced in translating raw data into actionable insights through academic and internship projects.",
    score: 86,
    tags: ["Python", "Pandas", "Scikit-learn"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "classic", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Kavya Menon", email: "kavya.menon@email.com", phone: "", location: "Hyderabad, India", website: "", linkedin: "", github: "", summary: "Entry-level Data Scientist with a strong foundation in statistics, machine learning, and Python. Experienced in translating raw data into actionable insights through academic and internship projects."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Insightify Analytics", jobTitle: "Data Science Intern", location: "", startDate: "2024", endDate: "2025", current: false, bullets: "Built a churn prediction model achieving 84% accuracy using logistic regression and XGBoost\nCleaned and processed 500K+ customer records for downstream analytics pipelines\nPresented findings to a cross-functional team, informing a retention campaign" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "IIIT Hyderabad", degree: "B.Tech, Computer Science", location: "", startDate: "", endDate: "2025", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Python", rating: 4 },
          { skill: "Pandas", rating: 4 },
          { skill: "Scikit-learn", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Statistics", rating: 4 },
          { skill: "Data Visualization", rating: 4 }
        ],
        descriptions: "Core Competencies: Python, Pandas, Scikit-learn, SQL, Statistics, Data Visualization, Tableau"
      }
    } as TBResumeData
  },
  {
    title: "Data Scientist",
    category: "Data Science",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Data Scientist with 5 years of experience building predictive models and experimentation frameworks for e-commerce platforms.",
    score: 92,
    tags: ["Python", "SQL", "A/B Testing"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Brian Nakamura", email: "brian.nakamura@email.com", phone: "", location: "Chicago, IL", website: "", linkedin: "", github: "", summary: "Data Scientist with 5 years of experience building predictive models and experimentation frameworks for e-commerce platforms."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Retailio Inc.", jobTitle: "Data Scientist", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Built demand forecasting model reducing inventory overstock by 22%\nDesigned A/B testing framework adopted across 5 product teams\nDeployed recommendation engine that increased average order value by 12%" },
        { id: crypto.randomUUID(), company: "Quantloop Analytics", jobTitle: "Junior Data Scientist", location: "", startDate: "2019", endDate: "2021", current: false, bullets: "Built customer segmentation model used to personalize email marketing campaigns\nAutomated weekly reporting pipeline, saving the team 10+ hours per week" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Illinois at Chicago", degree: "M.S. Data Science", location: "", startDate: "", endDate: "2019", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Python", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "A/B Testing", rating: 4 },
          { skill: "Machine Learning", rating: 4 },
          { skill: "Airflow", rating: 4 },
          { skill: "AWS", rating: 4 }
        ],
        descriptions: "Core Competencies: Python, SQL, A/B Testing, Machine Learning, Airflow, AWS, Forecasting"
      }
    } as TBResumeData
  },
  {
    title: "Senior Data Scientist",
    category: "Data Science",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Senior Data Scientist with 9 years of experience leading end-to-end ML projects, from problem framing to production deployment, across fintech and healthtech domains.",
    score: 95,
    tags: ["Python", "R", "Deep Learning"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "executive", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Sneha Iyer", email: "sneha.iyer@email.com", phone: "", location: "Bangalore, India", website: "", linkedin: "", github: "", summary: "Senior Data Scientist with 9 years of experience leading end-to-end ML projects, from problem framing to production deployment, across fintech and healthtech domains."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Vitalis Health Tech", jobTitle: "Senior Data Scientist", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Led development of a risk-scoring model deployed to 200,000+ patients, reducing readmission rate by 18%\nMentored a team of 4 junior data scientists on model validation best practices\nPartnered with engineering to deploy models via CI/CD, cutting release time from weeks to days" },
        { id: crypto.randomUUID(), company: "Finlytics Corp", jobTitle: "Data Scientist", location: "", startDate: "2016", endDate: "2020", current: false, bullets: "Built fraud detection model reducing false positives by 30% while maintaining recall\nPresented quarterly model performance reviews to senior leadership" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Indian Statistical Institute", degree: "M.S. Statistics", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Python", rating: 4 },
          { skill: "R", rating: 4 },
          { skill: "Deep Learning", rating: 4 },
          { skill: "MLOps", rating: 4 },
          { skill: "SQL", rating: 4 },
          { skill: "Model Deployment", rating: 4 }
        ],
        descriptions: "Core Competencies: Python, R, Deep Learning, MLOps, SQL, Model Deployment, Spark"
      }
    } as TBResumeData
  },
  {
    title: "Staff Data Scientist / ML Lead",
    category: "Data Science",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Staff Data Scientist with 12+ years of experience setting ML strategy and leading applied research teams. Specializes in scaling machine learning systems from prototype to production.",
    score: 97,
    tags: ["Machine Learning", "Deep Learning", "MLOps"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Alexandre Dupont", email: "alexandre.dupont@email.com", phone: "", location: "Toronto, Canada", website: "", linkedin: "", github: "", summary: "Staff Data Scientist with 12+ years of experience setting ML strategy and leading applied research teams. Specializes in scaling machine learning systems from prototype to production."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Northgate AI", jobTitle: "Staff Data Scientist", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Set ML technical strategy across 3 product lines, improving model accuracy by an average of 20%\nLed team of 10 data scientists and ML engineers delivering models to production at scale\nReduced model training costs by 45% through infrastructure optimization and distributed training" },
        { id: crypto.randomUUID(), company: "Beacon Analytics", jobTitle: "Senior Data Scientist", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Built pricing optimization model that increased margin by 8% across product portfolio\nPublished internal research adopted as company-wide modeling standard" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Toronto", degree: "Ph.D. Applied Mathematics", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Machine Learning", rating: 4 },
          { skill: "Deep Learning", rating: 4 },
          { skill: "MLOps", rating: 4 },
          { skill: "Python", rating: 4 },
          { skill: "Distributed Systems", rating: 4 },
          { skill: "Team Leadership", rating: 4 }
        ],
        descriptions: "Core Competencies: Machine Learning, Deep Learning, MLOps, Python, Distributed Systems, Team Leadership"
      }
    } as TBResumeData
  },
  {
    title: "Data Analyst / Analytics Specialist",
    category: "Data Science",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Data Analyst with 4 years of experience turning business questions into clear, data-driven recommendations using SQL, dashboards, and statistical analysis.",
    score: 89,
    tags: ["SQL", "Tableau", "Excel"],
    data: {
      customization: { font: "Helvetica", accentColor: "#a366ff", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Grace Oduya", email: "grace.oduya@email.com", phone: "", location: "Atlanta, GA", website: "", linkedin: "", github: "", summary: "Data Analyst with 4 years of experience turning business questions into clear, data-driven recommendations using SQL, dashboards, and statistical analysis."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Larkspur Consumer Goods", jobTitle: "Data Analyst", location: "", startDate: "2022", endDate: "Present", current: true, bullets: "Built executive dashboards tracking KPIs across 12 business units, adopted company-wide\nIdentified pricing inefficiency that unlocked $1.2M in annual margin improvement\nAutomated monthly reporting process, cutting turnaround time from 3 days to 4 hours" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Georgia State University", degree: "B.S. Statistics", location: "", startDate: "", endDate: "2021", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "SQL", rating: 4 },
          { skill: "Tableau", rating: 4 },
          { skill: "Excel", rating: 4 },
          { skill: "Python", rating: 4 },
          { skill: "Statistical Analysis", rating: 4 },
          { skill: "Data Storytelling", rating: 4 }
        ],
        descriptions: "Core Competencies: SQL, Tableau, Excel, Python, Statistical Analysis, Data Storytelling"
      }
    } as TBResumeData
  },
  {
    title: "Marketing Coordinator",
    category: "Marketing",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Marketing Coordinator with 3 years of experience supporting integrated campaigns across social, email, and content channels for consumer brands.",
    score: 85,
    tags: ["Email Marketing", "Social Media", "Content Calendars"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Chloe Bennett", email: "chloe.bennett@email.com", phone: "", location: "Orlando, FL", website: "", linkedin: "", github: "", summary: "Marketing Coordinator with 3 years of experience supporting integrated campaigns across social, email, and content channels for consumer brands."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Sunhouse Media Group", jobTitle: "Marketing Coordinator", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Launched email campaign series that grew subscriber list by 28% in 6 months\nCoordinated social content calendar across 3 platforms, increasing engagement by 34%\nSupported product launch campaign that drove 15,000+ landing page visits in launch week" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Central Florida", degree: "B.A. Marketing", location: "", startDate: "", endDate: "2022", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Email Marketing", rating: 4 },
          { skill: "Social Media", rating: 4 },
          { skill: "Content Calendars", rating: 4 },
          { skill: "Canva", rating: 4 },
          { skill: "HubSpot", rating: 4 },
          { skill: "Copywriting", rating: 4 }
        ],
        descriptions: "Core Competencies: Email Marketing, Social Media, Content Calendars, Canva, HubSpot, Copywriting"
      }
    } as TBResumeData
  },
  {
    title: "Digital Marketing Manager",
    category: "Marketing",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Digital Marketing Manager with 6 years of experience running paid acquisition and lifecycle marketing programs for DTC and SaaS brands.",
    score: 91,
    tags: ["Paid Media", "Google Ads", "Meta Ads"],
    data: {
      customization: { font: "Helvetica", accentColor: "#22c55e", stylePreset: "chikorita", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Jordan Mitchell", email: "jordan.mitchell@email.com", phone: "", location: "Los Angeles, CA", website: "", linkedin: "", github: "", summary: "Digital Marketing Manager with 6 years of experience running paid acquisition and lifecycle marketing programs for DTC and SaaS brands."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Voltage Consumer Brands", jobTitle: "Digital Marketing Manager", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Managed $1.5M annual paid media budget across Meta, Google, and TikTok, achieving 3.2x blended ROAS\nBuilt lifecycle email/SMS program that increased repeat purchase rate by 24%\nLed a team of 3 marketers and 2 agency partners across acquisition and retention" },
        { id: crypto.randomUUID(), company: "Loomstate Digital", jobTitle: "Performance Marketing Specialist", location: "", startDate: "2018", endDate: "2021", current: false, bullets: "Scaled paid social spend from $50K to $400K/month while improving CPA by 20%\nRan 100+ creative A/B tests, informing brand-wide creative strategy" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "California State University, Long Beach", degree: "B.S. Business Marketing", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Paid Media", rating: 4 },
          { skill: "Google Ads", rating: 4 },
          { skill: "Meta Ads", rating: 4 },
          { skill: "Lifecycle Marketing", rating: 4 },
          { skill: "Google Analytics", rating: 4 },
          { skill: "A/B Testing", rating: 4 }
        ],
        descriptions: "Core Competencies: Paid Media, Google Ads, Meta Ads, Lifecycle Marketing, Google Analytics, A/B Testing"
      }
    } as TBResumeData
  },
  {
    title: "Senior Product Marketing Manager",
    category: "Marketing",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Senior Product Marketing Manager with 8 years of experience leading go-to-market strategy for B2B SaaS products, from positioning through launch.",
    score: 93,
    tags: ["Go-to-Market Strategy", "Positioning", "Messaging"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "ditgar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Natalie Kim", email: "natalie.kim@email.com", phone: "", location: "San Francisco, CA", website: "", linkedin: "", github: "", summary: "Senior Product Marketing Manager with 8 years of experience leading go-to-market strategy for B2B SaaS products, from positioning through launch."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Cirrus Cloud Software", jobTitle: "Senior Product Marketing Manager", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Led go-to-market for flagship product launch, driving $4M in pipeline within first quarter\nDeveloped messaging and positioning framework adopted across sales and marketing teams\nPartnered with product and sales to launch enablement program, improving win rate by 15%" },
        { id: crypto.randomUUID(), company: "Brightframe Technologies", jobTitle: "Product Marketing Manager", location: "", startDate: "2017", endDate: "2020", current: false, bullets: "Launched 4 major product releases, each exceeding adoption targets within 90 days\nBuilt competitive intelligence program used company-wide by sales and product teams" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "UC Berkeley Haas School of Business", degree: "MBA", location: "", startDate: "", endDate: "2017", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Go-to-Market Strategy", rating: 4 },
          { skill: "Positioning", rating: 4 },
          { skill: "Messaging", rating: 4 },
          { skill: "Sales Enablement", rating: 4 },
          { skill: "Competitive Analysis", rating: 4 }
        ],
        descriptions: "Core Competencies: Go-to-Market Strategy, Positioning, Messaging, Sales Enablement, Competitive Analysis"
      }
    } as TBResumeData
  },
  {
    title: "Marketing Director",
    category: "Marketing",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Marketing Director with 12+ years of experience building and scaling marketing functions for mid-market and enterprise companies. Skilled in brand strategy, demand generation, and team leadership.",
    score: 97,
    tags: ["Brand Strategy", "Demand Generation", "Team Leadership"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "ditto", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Marcus Ellington", email: "marcus.ellington@email.com", phone: "", location: "Chicago, IL", website: "", linkedin: "", github: "", summary: "Marketing Director with 12+ years of experience building and scaling marketing functions for mid-market and enterprise companies. Skilled in brand strategy, demand generation, and team leadership."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Ferndale Industrial Group", jobTitle: "Marketing Director", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Built marketing function from the ground up, growing team from 3 to 15\nGrew marketing-sourced pipeline from $8M to $30M annually over 4 years\nSet brand strategy that increased unaided brand awareness by 40% in core markets" },
        { id: crypto.randomUUID(), company: "Halston Consumer Products", jobTitle: "Senior Marketing Manager", location: "", startDate: "2014", endDate: "2019", current: false, bullets: "Led rebrand initiative that improved customer perception scores by 25%\nManaged $3M annual marketing budget across brand and performance channels" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Northwestern University", degree: "B.A. Communications", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Brand Strategy", rating: 4 },
          { skill: "Demand Generation", rating: 4 },
          { skill: "Team Leadership", rating: 4 },
          { skill: "Budget Management", rating: 4 },
          { skill: "Marketing Ops", rating: 4 }
        ],
        descriptions: "Core Competencies: Brand Strategy, Demand Generation, Team Leadership, Budget Management, Marketing Ops"
      }
    } as TBResumeData
  },
  {
    title: "Content Marketing Manager",
    category: "Marketing",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Content Marketing Manager with 5 years of experience building organic growth engines through SEO-driven content, thought leadership, and editorial strategy.",
    score: 89,
    tags: ["SEO", "Content Strategy", "Editorial Planning"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "gengar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Priya Nair", email: "priya.nair@email.com", phone: "", location: "Mumbai, India", website: "", linkedin: "", github: "", summary: "Content Marketing Manager with 5 years of experience building organic growth engines through SEO-driven content, thought leadership, and editorial strategy."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Blueprint Digital Media", jobTitle: "Content Marketing Manager", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Grew organic blog traffic from 20K to 180K monthly visitors in 2 years\nBuilt content strategy that generated 3,500+ inbound leads over 12 months\nManaged team of 4 writers and 2 freelance contributors across content production" },
        { id: crypto.randomUUID(), company: "Klarity Media Group", jobTitle: "Content Strategist", location: "", startDate: "2019", endDate: "2021", current: false, bullets: "Launched SEO program that increased organic search rankings for 200+ target keywords\nWrote and edited 150+ pieces of long-form content driving top-of-funnel awareness" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Mumbai", degree: "B.A. Mass Media", location: "", startDate: "", endDate: "2019", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "SEO", rating: 4 },
          { skill: "Content Strategy", rating: 4 },
          { skill: "Editorial Planning", rating: 4 },
          { skill: "Google Analytics", rating: 4 },
          { skill: "Copywriting", rating: 4 },
          { skill: "WordPress", rating: 4 }
        ],
        descriptions: "Core Competencies: SEO, Content Strategy, Editorial Planning, Google Analytics, Copywriting, WordPress"
      }
    } as TBResumeData
  },
  {
    title: "Financial Analyst",
    category: "Finance",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Financial Analyst with 5+ years specializing in investment analysis and financial modeling for mid-market clients.",
    score: 97,
    tags: ["Financial Modeling","Valuation","Excel"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "glalie", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Ethan Park", email: "ethan.park@email.com", phone: "", location: "New York, NY", website: "", linkedin: "", github: "", summary: "Financial Analyst with 5+ years specializing in investment analysis and financial modeling for mid-market clients."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Halbrook Capital Partners", jobTitle: "Financial Analyst", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Built valuation models that informed $120M in investment decisions across 8 deals\\nImproved forecast accuracy by 18% through revised variance analysis methodology\\nAutomated monthly reporting package, cutting preparation time from 3 days to 4 hours" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "New York University", degree: "B.S. Finance", location: "", startDate: "", endDate: "2020", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Financial Modeling", rating: 4 }, { skill: "Valuation", rating: 4 }, { skill: "Excel", rating: 4 }, { skill: "Python", rating: 4 }, { skill: "Forecasting", rating: 4 }, { skill: "Bloomberg Terminal", rating: 4 }
        ],
        descriptions: "Core Competencies: Financial Modeling, Valuation, Excel, Python, Forecasting, Bloomberg Terminal"
      }
    } as TBResumeData  },
  {
    title: "Senior Financial Analyst",
    category: "Finance",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Senior Financial Analyst with 8 years of experience leading budgeting, forecasting, and cost-saving initiatives for manufacturing and retail clients.",
    score: 89,
    tags: ["Budgeting","Forecasting","Cost Analysis"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "kakuna", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Meera Patel", email: "meera.patel@email.com", phone: "", location: "Mumbai, India", website: "", linkedin: "", github: "", summary: "Senior Financial Analyst with 8 years of experience leading budgeting, forecasting, and cost-saving initiatives for manufacturing and retail clients."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Sterling Manufacturing Ltd.", jobTitle: "Senior Financial Analyst", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Developed a strategic financial model that identified $2.5M in cost-saving opportunities\\nLed cross-functional team to reduce quarterly close cycle by 40%\\nPresented quarterly financial reviews directly to the CFO and senior leadership" }, { id: crypto.randomUUID(), company: "Keystone Advisory Group", jobTitle: "Financial Analyst", location: "", startDate: "2016", endDate: "2019", current: false, bullets: "Built rolling 13-week cash flow forecasts used for treasury decision-making\\nSupported due diligence on 4 acquisition targets totaling $60M in value" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Indian Institute of Management Bangalore", degree: "MBA, Finance", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Budgeting", rating: 4 }, { skill: "Forecasting", rating: 4 }, { skill: "Cost Analysis", rating: 4 }, { skill: "SAP", rating: 4 }, { skill: "Financial Reporting", rating: 4 }, { skill: "Excel", rating: 4 }
        ],
        descriptions: "Core Competencies: Budgeting, Forecasting, Cost Analysis, SAP, Financial Reporting, Excel"
      }
    } as TBResumeData  },
  {
    title: "Finance Manager",
    category: "Finance",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Finance Manager with 12 years of experience specializing in financial planning and operational efficiency, aligning forecasting models with business strategy.",
    score: 96,
    tags: ["Financial Planning","Team Leadership","Process Improvement"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "lapras", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "David Whitfield", email: "david.whitfield@email.com", phone: "", location: "Denver, CO", website: "", linkedin: "", github: "", summary: "Finance Manager with 12 years of experience specializing in financial planning and operational efficiency, aligning forecasting models with business strategy."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Optima Financial Solutions", jobTitle: "Finance Manager", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Reduced month-end close time from 12 to 3 days by automating reconciliation processes\\nCut operational costs by 22% through process optimization and financial control implementation\\nLed team of 5 analysts responsible for budgeting, forecasting, and variance reporting" }, { id: crypto.randomUUID(), company: "Alden Regional Bank", jobTitle: "Senior Financial Analyst", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Managed annual budget process across 6 business units totaling $85M\\nBuilt financial dashboards used by executive team for weekly performance reviews" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Colorado Boulder", degree: "B.S. Accounting", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Financial Planning", rating: 4 }, { skill: "Team Leadership", rating: 4 }, { skill: "Process Improvement", rating: 4 }, { skill: "Forecasting Models", rating: 4 }, { skill: "NetSuite", rating: 4 }
        ],
        descriptions: "Core Competencies: Financial Planning, Team Leadership, Process Improvement, Forecasting Models, NetSuite"
      }
    } as TBResumeData  },
  {
    title: "Corporate Finance Manager",
    category: "Finance",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Corporate Finance Manager with 10 years of experience leading debt restructuring, forecasting, and reporting initiatives for large enterprises.",
    score: 87,
    tags: ["Debt Restructuring","Capital Markets","Financial Modeling"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "leafish", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Isabelle Moreau", email: "isabelle.moreau@email.com", phone: "", location: "Chicago, IL", website: "", linkedin: "", github: "", summary: "Corporate Finance Manager with 10 years of experience leading debt restructuring, forecasting, and reporting initiatives for large enterprises."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Marlow Industrial Holdings", jobTitle: "Corporate Finance Manager", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Led restructuring of $250M debt portfolio, decreasing annual interest expense by $3.2M\\nImproved forecasting accuracy by implementing AI-assisted reconciliation tools\\nManaged relationships with banking partners and rating agencies" }, { id: crypto.randomUUID(), company: "Braxton Financial Group", jobTitle: "Finance Analyst", location: "", startDate: "2015", endDate: "2019", current: false, bullets: "Supported capital structure analysis for 3 major refinancing transactions\\nBuilt ESG reporting framework adopted for investor communications" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Chicago Booth", degree: "MBA, Corporate Finance", location: "", startDate: "", endDate: "2015", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Debt Restructuring", rating: 4 }, { skill: "Capital Markets", rating: 4 }, { skill: "Financial Modeling", rating: 4 }, { skill: "ESG Reporting", rating: 4 }, { skill: "Treasury", rating: 4 }
        ],
        descriptions: "Core Competencies: Debt Restructuring, Capital Markets, Financial Modeling, ESG Reporting, Treasury"
      }
    } as TBResumeData  },
  {
    title: "Finance Director",
    category: "Finance",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Finance Director with 15+ years of experience driving financial strategy and operational excellence across multiple markets, with a focus on cash flow forecasting and compliance.",
    score: 94,
    tags: ["Financial Strategy","Treasury Management","Compliance"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "meowth", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Robert Ainsley", email: "robert.ainsley@email.com", phone: "", location: "Boston, MA", website: "", linkedin: "", github: "", summary: "Finance Director with 15+ years of experience driving financial strategy and operational excellence across multiple markets, with a focus on cash flow forecasting and compliance."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Ashford Global Enterprises", jobTitle: "Finance Director", location: "", startDate: "2017", endDate: "Present", current: true, bullets: "Led global treasury restructuring across 4 regions, improving cash visibility by 50%\\nDirected annual budgeting process for a $400M business unit\\nBuilt financial planning team from 4 to 14 members over 6 years" }, { id: crypto.randomUUID(), company: "Rockwell Financial Partners", jobTitle: "Senior Finance Manager", location: "", startDate: "2012", endDate: "2017", current: false, bullets: "Oversaw compliance reporting across 3 regulatory jurisdictions\\nReduced forecasting variance by 15% through improved rolling forecast models" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Boston College", degree: "MBA, Finance", location: "", startDate: "", endDate: "2011", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Financial Strategy", rating: 4 }, { skill: "Treasury Management", rating: 4 }, { skill: "Compliance", rating: 4 }, { skill: "Team Leadership", rating: 4 }, { skill: "Cash Flow Forecasting", rating: 4 }
        ],
        descriptions: "Core Competencies: Financial Strategy, Treasury Management, Compliance, Team Leadership, Cash Flow Forecasting"
      }
    } as TBResumeData  },
  {
    title: "Junior HR Specialist",
    category: "Human Resources",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Junior HR Specialist with 2 years of experience supporting recruitment, onboarding, and employee relations in a fast-paced environment.",
    score: 96,
    tags: ["HRIS","Onboarding","Recruitment Coordination"],
    data: {
      customization: { font: "Helvetica", accentColor: "#a366ff", stylePreset: "pikachu", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Sophia Delgado", email: "sophia.delgado@email.com", phone: "", location: "Phoenix, AZ", website: "", linkedin: "", github: "", summary: "Junior HR Specialist with 2 years of experience supporting recruitment, onboarding, and employee relations in a fast-paced environment."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Cornerstone Retail Group", jobTitle: "Junior HR Specialist", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Coordinated onboarding for 80+ new hires, reducing time-to-productivity by 20%\\nMaintained HRIS records for a workforce of 300+ employees with zero compliance errors\\nSupported recruitment process, scheduling 150+ interviews across 5 departments" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Arizona State University", degree: "B.A. Human Resource Management", location: "", startDate: "", endDate: "2023", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "HRIS", rating: 4 }, { skill: "Onboarding", rating: 4 }, { skill: "Recruitment Coordination", rating: 4 }, { skill: "Employee Relations", rating: 4 }, { skill: "Compliance", rating: 4 }
        ],
        descriptions: "Core Competencies: HRIS, Onboarding, Recruitment Coordination, Employee Relations, Compliance"
      }
    } as TBResumeData  },
  {
    title: "HR Generalist",
    category: "Human Resources",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "HR Generalist with 6 years of experience managing full-cycle recruitment, employee relations, and performance management programs.",
    score: 89,
    tags: ["Full-Cycle Recruitment","Employee Relations","Performance Management"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "rhyhorn", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Michael Torres", email: "michael.torres@email.com", phone: "", location: "Dallas, TX", website: "", linkedin: "", github: "", summary: "HR Generalist with 6 years of experience managing full-cycle recruitment, employee relations, and performance management programs."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Palermo Logistics Co.", jobTitle: "HR Generalist", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Managed full-cycle recruitment for 40+ roles annually, reducing time-to-hire by 25%\\nRolled out performance management system adopted across 5 departments\\nResolved employee relations cases while maintaining 98% policy compliance" }, { id: crypto.randomUUID(), company: "Brightfield Solutions", jobTitle: "HR Coordinator", location: "", startDate: "2018", endDate: "2020", current: false, bullets: "Supported benefits administration for a workforce of 250 employees\\nCoordinated new hire orientation program, improving 90-day retention by 15%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Texas A&M University", degree: "B.A. Human Resources", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Full-Cycle Recruitment", rating: 4 }, { skill: "Employee Relations", rating: 4 }, { skill: "Performance Management", rating: 4 }, { skill: "HRIS", rating: 4 }, { skill: "Benefits Admin", rating: 4 }
        ],
        descriptions: "Core Competencies: Full-Cycle Recruitment, Employee Relations, Performance Management, HRIS, Benefits Admin"
      }
    } as TBResumeData  },
  {
    title: "HR Manager",
    category: "Human Resources",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Human Resources Manager with 12+ years of experience driving organizational success through strategic talent management and people-centric initiatives.",
    score: 98,
    tags: ["Talent Management","DEI Programs","Workforce Planning"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "scizor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Rachel Kim", email: "rachel.kim@email.com", phone: "", location: "Seattle, WA", website: "", linkedin: "", github: "", summary: "Human Resources Manager with 12+ years of experience driving organizational success through strategic talent management and people-centric initiatives."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Cascadia Tech Group", jobTitle: "HR Manager", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Led company-wide HR process digitization, increasing employee engagement scores by 30%\\nReduced turnover by 25% through revised onboarding and manager training programs\\nManaged team of 6 HR professionals across recruiting, employee relations, and L&D" }, { id: crypto.randomUUID(), company: "Ironwood Financial", jobTitle: "Senior HR Business Partner", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Partnered with department leaders to design workforce planning strategy for 400+ employees\\nLaunched DEI initiative that increased underrepresented hires by 20%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Washington", degree: "M.S. Human Resource Management", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Talent Management", rating: 4 }, { skill: "DEI Programs", rating: 4 }, { skill: "Workforce Planning", rating: 4 }, { skill: "Employee Engagement", rating: 4 }, { skill: "SHRM-CP", rating: 4 }
        ],
        descriptions: "Core Competencies: Talent Management, DEI Programs, Workforce Planning, Employee Engagement, SHRM-CP"
      }
    } as TBResumeData  },
  {
    title: "HR Business Partner",
    category: "Human Resources",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "HR Business Partner with 9 years of experience advising senior leaders on talent strategy, org design, and change management for growing organizations.",
    score: 93,
    tags: ["Org Design","Change Management","Talent Strategy"],
    data: {
      customization: { font: "Helvetica", accentColor: "#a366ff", stylePreset: "classic", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Angela Ferreira", email: "angela.ferreira@email.com", phone: "", location: "Miami, FL", website: "", linkedin: "", github: "", summary: "HR Business Partner with 9 years of experience advising senior leaders on talent strategy, org design, and change management for growing organizations."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Solara Consumer Brands", jobTitle: "HR Business Partner", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Advised VP-level leaders on org design during a company restructuring affecting 200+ roles\\nBuilt manager training program that improved employee satisfaction scores by 18%\\nLed change management for HRIS migration across 3 business units" }, { id: crypto.randomUUID(), company: "Vantage Retail Holdings", jobTitle: "HR Generalist", location: "", startDate: "2016", endDate: "2019", current: false, bullets: "Supported talent acquisition strategy for rapid growth phase, hiring 150+ employees in one year\\nImplemented employee recognition program adopted company-wide" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Florida State University", degree: "B.A. Organizational Psychology", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Org Design", rating: 4 }, { skill: "Change Management", rating: 4 }, { skill: "Talent Strategy", rating: 4 }, { skill: "Employee Relations", rating: 4 }, { skill: "Workday", rating: 4 }
        ],
        descriptions: "Core Competencies: Org Design, Change Management, Talent Strategy, Employee Relations, Workday"
      }
    } as TBResumeData  },
  {
    title: "HR Director",
    category: "Human Resources",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "HR Director with over 15 years of experience in strategic human resources management, driving organizational transformation and talent strategy at scale.",
    score: 92,
    tags: ["HR Strategy","Compensation & Benefits","M&A Integration"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "William Chen", email: "william.chen@email.com", phone: "", location: "San Francisco, CA", website: "", linkedin: "", github: "", summary: "HR Director with over 15 years of experience in strategic human resources management, driving organizational transformation and talent strategy at scale."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Meridian Software Inc.", jobTitle: "HR Director", location: "", startDate: "2017", endDate: "Present", current: true, bullets: "Built HR function from 8 to 35 team members supporting 2,000+ employees\\nLed compensation and benefits redesign, improving offer acceptance rate by 22%\\nDirected HR strategy through 2 acquisitions, integrating 400+ employees smoothly" }, { id: crypto.randomUUID(), company: "Ashgrove Manufacturing", jobTitle: "Senior HR Manager", location: "", startDate: "2011", endDate: "2017", current: false, bullets: "Led labor relations efforts across 3 manufacturing sites\\nReduced HR-related compliance incidents by 40% through policy overhaul" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "UC Berkeley Haas School of Business", degree: "MBA, Human Resources", location: "", startDate: "", endDate: "2010", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "HR Strategy", rating: 4 }, { skill: "Compensation & Benefits", rating: 4 }, { skill: "M&A Integration", rating: 4 }, { skill: "Labor Relations", rating: 4 }, { skill: "SPHR", rating: 4 }
        ],
        descriptions: "Core Competencies: HR Strategy, Compensation & Benefits, M&A Integration, Labor Relations, SPHR"
      }
    } as TBResumeData  },
  {
    title: "Entry Level Customer Service Representative",
    category: "Customer Support",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Entry-level Customer Service Representative with strong communication skills and adaptability in fast-paced support environments.",
    score: 89,
    tags: ["CRM Software","Conflict Resolution","Multi-channel Support"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "executive", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Bianca Torres", email: "bianca.torres@email.com", phone: "", location: "Orlando, FL", website: "", linkedin: "", github: "", summary: "Entry-level Customer Service Representative with strong communication skills and adaptability in fast-paced support environments."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Coastal Retail Group", jobTitle: "Customer Service Representative", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Handled 60+ customer inquiries daily via phone and chat with a 96% satisfaction rating\\nResolved billing disputes for 200+ customers per month using internal CRM tools\\nRecognized as top performer for first-call resolution rate 3 months running" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Valencia College", degree: "Associate Degree, Business", location: "", startDate: "", endDate: "2023", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "CRM Software", rating: 4 }, { skill: "Conflict Resolution", rating: 4 }, { skill: "Multi-channel Support", rating: 4 }, { skill: "Zendesk", rating: 4 }, { skill: "Communication", rating: 4 }
        ],
        descriptions: "Core Competencies: CRM Software, Conflict Resolution, Multi-channel Support, Zendesk, Communication"
      }
    } as TBResumeData  },
  {
    title: "Customer Service Representative",
    category: "Customer Support",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Customer Service Representative with 5+ years of experience specializing in conflict resolution and CRM-driven support.",
    score: 93,
    tags: ["Salesforce","Conflict Resolution","Knowledge Base Management"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Jordan Ellis", email: "jordan.ellis@email.com", phone: "", location: "Phoenix, AZ", website: "", linkedin: "", github: "", summary: "Customer Service Representative with 5+ years of experience specializing in conflict resolution and CRM-driven support."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "SupportCentral Inc.", jobTitle: "Customer Service Representative", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Managed a portfolio of 150+ customer accounts, achieving a personal CSAT score of 4.8/5\\nLed knowledge base overhaul project, reducing repeat inquiries by 25%\\nImproved average response time on social channels by 40%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Arizona State University", degree: "B.A. Communications", location: "", startDate: "", endDate: "2020", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Salesforce", rating: 4 }, { skill: "Conflict Resolution", rating: 4 }, { skill: "Knowledge Base Management", rating: 4 }, { skill: "Social Support", rating: 4 }, { skill: "CSAT", rating: 4 }
        ],
        descriptions: "Core Competencies: Salesforce, Conflict Resolution, Knowledge Base Management, Social Support, CSAT"
      }
    } as TBResumeData  },
  {
    title: "Customer Service Specialist",
    category: "Customer Support",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Customer Service Specialist with 8+ years of experience driving client satisfaction through omnichannel support and data-driven problem-solving.",
    score: 93,
    tags: ["Omnichannel Support","CRM Systems","Emotional Intelligence"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Camille Dubois", email: "camille.dubois@email.com", phone: "", location: "Remote / US", website: "", linkedin: "", github: "", summary: "Customer Service Specialist with 8+ years of experience driving client satisfaction through omnichannel support and data-driven problem-solving."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Northbridge Consumer Tech", jobTitle: "Customer Service Specialist", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Achieved 98% customer retention rate managing high-volume omnichannel support queue\\nIntroduced self-service knowledge base, reducing inbound call volume by 15%\\nMentored 4 new hires on CRM systems and de-escalation techniques" }, { id: crypto.randomUUID(), company: "Vesta Home Goods", jobTitle: "Customer Service Representative", location: "", startDate: "2016", endDate: "2019", current: false, bullets: "Resolved 40+ customer complaints daily with a 95% satisfaction rate\\nSupported product launch by fielding 500+ inquiries during first release week" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Portland State University", degree: "B.A. Business Administration", location: "", startDate: "", endDate: "2015", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Omnichannel Support", rating: 4 }, { skill: "CRM Systems", rating: 4 }, { skill: "Emotional Intelligence", rating: 4 }, { skill: "Data Analytics", rating: 4 }, { skill: "Self-Service Tools", rating: 4 }
        ],
        descriptions: "Core Competencies: Omnichannel Support, CRM Systems, Emotional Intelligence, Data Analytics, Self-Service Tools"
      }
    } as TBResumeData  },
  {
    title: "Customer Service Executive",
    category: "Customer Support",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Customer Service Executive with 7 years of experience managing customer relationships, resolving complex issues, and leading small support teams.",
    score: 92,
    tags: ["CRM Tools","Team Training","Escalation Management"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Derek Osei", email: "derek.osei@email.com", phone: "", location: "Atlanta, GA", website: "", linkedin: "", github: "", summary: "Customer Service Executive with 7 years of experience managing customer relationships, resolving complex issues, and leading small support teams."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Larchmont Financial Services", jobTitle: "Customer Service Executive", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Resolved customer inquiries with a 95% satisfaction rate, exceeding monthly performance targets\\nCollaborated with IT to troubleshoot recurring technical issues, improving system reliability\\nTrained and mentored 5 junior representatives on de-escalation best practices" }, { id: crypto.randomUUID(), company: "Glendale Insurance Group", jobTitle: "Customer Service Representative", location: "", startDate: "2017", endDate: "2020", current: false, bullets: "Handled high-volume claims inquiries, maintaining a 92% first-call resolution rate\\nAssisted in rollout of new CRM system across the support department" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Georgia State University", degree: "B.A. Business Administration", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "CRM Tools", rating: 4 }, { skill: "Team Training", rating: 4 }, { skill: "Escalation Management", rating: 4 }, { skill: "Client Relations", rating: 4 }, { skill: "Process Improvement", rating: 4 }
        ],
        descriptions: "Core Competencies: CRM Tools, Team Training, Escalation Management, Client Relations, Process Improvement"
      }
    } as TBResumeData  },
  {
    title: "Customer Service Manager",
    category: "Customer Support",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Customer Service Manager with 10+ years of experience leading support teams, implementing CRM systems, and improving customer retention.",
    score: 92,
    tags: ["Team Leadership","CRM Implementation","Customer Retention"],
    data: {
      customization: { font: "Helvetica", accentColor: "#22c55e", stylePreset: "chikorita", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Laura Bennett", email: "laura.bennett@email.com", phone: "", location: "Columbus, OH", website: "", linkedin: "", github: "", summary: "Customer Service Manager with 10+ years of experience leading support teams, implementing CRM systems, and improving customer retention."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Customer Care Co.", jobTitle: "Customer Service Manager", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Managed a team of 10 representatives, achieving a 20% increase in team productivity\\nImplemented new CRM system, boosting customer retention rates by 10%\\nReduced related support tickets by 50% by partnering with product on recurring issues" }, { id: crypto.randomUUID(), company: "Fieldstone Retailers", jobTitle: "Senior Customer Service Representative", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Led customer feedback loop initiative, increasing actionable insights by 35%\\nSupported loyalty program launch, contributing to a 10% increase in repeat business" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Ohio State University", degree: "B.A. Business Management", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Team Leadership", rating: 4 }, { skill: "CRM Implementation", rating: 4 }, { skill: "Customer Retention", rating: 4 }, { skill: "Coaching", rating: 4 }, { skill: "Process Optimization", rating: 4 }
        ],
        descriptions: "Core Competencies: Team Leadership, CRM Implementation, Customer Retention, Coaching, Process Optimization"
      }
    } as TBResumeData  },
  {
    title: "Beginner Graphic Designer",
    category: "Graphic Design",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Beginner Graphic Designer with a keen eye for visual storytelling and 2 years of hands-on experience in digital and print design.",
    score: 85,
    tags: ["Adobe Creative Suite","Figma","Typography"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "ditgar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Zoe Marchetti", email: "zoe.marchetti@email.com", phone: "", location: "Austin, TX", website: "", linkedin: "", github: "", summary: "Beginner Graphic Designer with a keen eye for visual storytelling and 2 years of hands-on experience in digital and print design."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Lumen Creative Studio", jobTitle: "Junior Graphic Designer", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Delivered a brand refresh project that increased client engagement by 35%\\nDesigned marketing collateral for 15+ small business clients\\nCollaborated with senior designers on a major e-commerce UI redesign" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Texas at Austin", degree: "B.F.A. Graphic Design", location: "", startDate: "", endDate: "2023", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Adobe Creative Suite", rating: 4 }, { skill: "Figma", rating: 4 }, { skill: "Typography", rating: 4 }, { skill: "Branding", rating: 4 }, { skill: "UX/UI Basics", rating: 4 }
        ],
        descriptions: "Core Competencies: Adobe Creative Suite, Figma, Typography, Branding, UX/UI Basics"
      }
    } as TBResumeData  },
  {
    title: "Graphic Designer",
    category: "Graphic Design",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Graphic Designer with 7 years of experience spanning agency, in-house, and enterprise work, blending storytelling with technical execution.",
    score: 95,
    tags: ["Design Systems","Adobe Creative Suite","Motion Graphics"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "ditto", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Julian Ortega", email: "julian.ortega@email.com", phone: "", location: "Chicago, IL", website: "", linkedin: "", github: "", summary: "Graphic Designer with 7 years of experience spanning agency, in-house, and enterprise work, blending storytelling with technical execution."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Fieldhouse Creative Agency", jobTitle: "Graphic Designer", location: "", startDate: "2021", endDate: "Present", current: true, bullets: "Led redesign of a client's visual identity system, improving brand recognition by 30%\\nReduced production costs by 26% through reusable asset libraries and tooling improvements\\nDesigned cross-platform campaigns for 20+ clients across retail and tech sectors" }, { id: crypto.randomUUID(), company: "Northline Studio", jobTitle: "Junior Designer", location: "", startDate: "2018", endDate: "2021", current: false, bullets: "Produced print and digital assets for 10+ product launches\\nAssisted in motion graphics production for social media campaigns" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "School of the Art Institute of Chicago", degree: "B.F.A. Visual Communication", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Design Systems", rating: 4 }, { skill: "Adobe Creative Suite", rating: 4 }, { skill: "Motion Graphics", rating: 4 }, { skill: "Brand Identity", rating: 4 }, { skill: "Figma", rating: 4 }
        ],
        descriptions: "Core Competencies: Design Systems, Adobe Creative Suite, Motion Graphics, Brand Identity, Figma"
      }
    } as TBResumeData  },
  {
    title: "Freelance Graphic Designer",
    category: "Graphic Design",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Freelance Graphic Designer with 8+ years of experience crafting visually compelling, user-centric designs across digital and print media for global clients.",
    score: 85,
    tags: ["Brand Identity","Client Management","Adobe Creative Suite"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "gengar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Harper Lindqvist", email: "harper.lindqvist@email.com", phone: "", location: "Remote / EU", website: "", linkedin: "", github: "", summary: "Freelance Graphic Designer with 8+ years of experience crafting visually compelling, user-centric designs across digital and print media for global clients."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Independent / Freelance", jobTitle: "Freelance Graphic Designer", location: "", startDate: "2017", endDate: "Present", current: true, bullets: "Increased client conversion rates by 40% through data-driven design strategies\\nDesigned brand identities and digital campaigns for 30+ clients across industries\\nLed a team of 3 junior designers on a rebrand project for an international retail client" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Konstfack University of Arts", degree: "B.A. Graphic Design", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Brand Identity", rating: 4 }, { skill: "Client Management", rating: 4 }, { skill: "Adobe Creative Suite", rating: 4 }, { skill: "Figma", rating: 4 }, { skill: "3D Modeling", rating: 4 }
        ],
        descriptions: "Core Competencies: Brand Identity, Client Management, Adobe Creative Suite, Figma, 3D Modeling"
      }
    } as TBResumeData  },
  {
    title: "UI/UX & Graphic Designer",
    category: "Graphic Design",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "UI/UX-focused Graphic Designer with 6 years of experience improving digital product engagement through research-driven visual design.",
    score: 94,
    tags: ["UI/UX Design","Figma","Prototyping"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "glalie", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Noah Fitzgerald", email: "noah.fitzgerald@email.com", phone: "", location: "San Diego, CA", website: "", linkedin: "", github: "", summary: "UI/UX-focused Graphic Designer with 6 years of experience improving digital product engagement through research-driven visual design."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Bluecrest Digital", jobTitle: "UI/UX Designer", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Redesigned e-commerce platform UI, increasing conversion rates by 35%\\nReduced cart abandonment by 28% through improved checkout flow design\\nImplemented AI-assisted design tooling, cutting asset production time by 40%" }, { id: crypto.randomUUID(), company: "Parkview Creative", jobTitle: "Graphic Designer", location: "", startDate: "2018", endDate: "2020", current: false, bullets: "Produced UI assets and style guides for 8 client web applications\\nCollaborated with developers to ensure design-to-code fidelity" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "San Diego State University", degree: "B.A. Interaction Design", location: "", startDate: "", endDate: "2018", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "UI/UX Design", rating: 4 }, { skill: "Figma", rating: 4 }, { skill: "Prototyping", rating: 4 }, { skill: "User Research", rating: 4 }, { skill: "Adobe XD", rating: 4 }
        ],
        descriptions: "Core Competencies: UI/UX Design, Figma, Prototyping, User Research, Adobe XD"
      }
    } as TBResumeData  },
  {
    title: "Senior Graphic Designer",
    category: "Graphic Design",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Senior Graphic Designer with 10+ years of experience crafting visually compelling brand narratives for Fortune 500 companies.",
    score: 92,
    tags: ["Brand Strategy","Team Leadership","AR/VR Design"],
    data: {
      customization: { font: "Helvetica", accentColor: "#22c55e", stylePreset: "kakuna", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Renata Alves", email: "renata.alves@email.com", phone: "", location: "New York, NY", website: "", linkedin: "", github: "", summary: "Senior Graphic Designer with 10+ years of experience crafting visually compelling brand narratives for Fortune 500 companies."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "ProDesigners Inc.", jobTitle: "Senior Graphic Designer", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Led rebranding of a Fortune 500 company, managing a team of 12 designers across all platforms\\nDrove a 40% increase in brand recognition and 25% boost in customer engagement\\nIntegrated AR/VR elements into brand campaigns for 3 major product launches" }, { id: crypto.randomUUID(), company: "Meadowlark Branding Co.", jobTitle: "Graphic Designer", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Designed visual identity systems for 25+ mid-market clients\\nMentored 4 junior designers, 2 of whom were promoted to senior roles" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Parsons School of Design", degree: "B.F.A. Graphic Design", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Brand Strategy", rating: 4 }, { skill: "Team Leadership", rating: 4 }, { skill: "AR/VR Design", rating: 4 }, { skill: "Adobe Creative Suite", rating: 4 }, { skill: "Art Direction", rating: 4 }
        ],
        descriptions: "Core Competencies: Brand Strategy, Team Leadership, AR/VR Design, Adobe Creative Suite, Art Direction"
      }
    } as TBResumeData  },
  {
    title: "Entry-Level Registered Nurse",
    category: "Healthcare",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Organized and compassionate Registered Nurse with 2 years of hands-on clinical experience, skilled in patient assessment and medication administration.",
    score: 92,
    tags: ["Patient Assessment","Medication Administration","EHR Systems"],
    data: {
      customization: { font: "Helvetica", accentColor: "#22c55e", stylePreset: "lapras", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Hannah Cortez", email: "hannah.cortez@email.com", phone: "", location: "San Antonio, TX", website: "", linkedin: "", github: "", summary: "Organized and compassionate Registered Nurse with 2 years of hands-on clinical experience, skilled in patient assessment and medication administration."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Riverside Community Hospital", jobTitle: "Registered Nurse", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Provided direct patient care for up to 6 patients per shift in a medical-surgical unit\\nAssisted in implementing new electronic health record workflows, reducing charting time by 15%\\nEducated patients and families on discharge care plans, supporting a smooth transition home" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Texas Health San Antonio", degree: "B.S. Nursing", location: "", startDate: "", endDate: "2023", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Patient Assessment", rating: 4 }, { skill: "Medication Administration", rating: 4 }, { skill: "EHR Systems", rating: 4 }, { skill: "BLS/ACLS", rating: 4 }, { skill: "Patient Education", rating: 4 }
        ],
        descriptions: "Core Competencies: Patient Assessment, Medication Administration, EHR Systems, BLS/ACLS, Patient Education"
      }
    } as TBResumeData  },
  {
    title: "Registered Nurse, Critical Care",
    category: "Healthcare",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Dedicated Registered Nurse with 8+ years of experience in critical care, skilled in advanced life support and patient education program design.",
    score: 85,
    tags: ["Critical Care","Advanced Life Support","Patient Education"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "leafish", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Olivia Ferreira", email: "olivia.ferreira@email.com", phone: "", location: "Tampa, FL", website: "", linkedin: "", github: "", summary: "Dedicated Registered Nurse with 8+ years of experience in critical care, skilled in advanced life support and patient education program design."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Bayview Medical Center", jobTitle: "Registered Nurse, ICU", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Implemented a patient education program that reduced readmission rates by 22%\\nProvided critical care to patients in a 20-bed ICU with a 1:2 patient ratio\\nTrained 10+ new nurses on advanced life support protocols" }, { id: crypto.randomUUID(), company: "Harborview Regional Hospital", jobTitle: "Registered Nurse", location: "", startDate: "2016", endDate: "2019", current: false, bullets: "Delivered patient-centered care in a high-volume 40-bed unit\\nCollaborated with multidisciplinary teams to improve care coordination" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of South Florida", degree: "B.S. Nursing", location: "", startDate: "", endDate: "2015", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Critical Care", rating: 4 }, { skill: "Advanced Life Support", rating: 4 }, { skill: "Patient Education", rating: 4 }, { skill: "EHR", rating: 4 }, { skill: "Telemetry", rating: 4 }
        ],
        descriptions: "Core Competencies: Critical Care, Advanced Life Support, Patient Education, EHR, Telemetry"
      }
    } as TBResumeData  },
  {
    title: "Nurse Case Manager",
    category: "Healthcare",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Registered Nurse Case Manager with 7 years of experience coordinating care for patients with complex chronic conditions across in-person and telehealth settings.",
    score: 92,
    tags: ["Case Management","Chronic Disease Care","Telehealth"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "meowth", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Grace Whitfield", email: "grace.whitfield@email.com", phone: "", location: "Tulsa, OK", website: "", linkedin: "", github: "", summary: "Registered Nurse Case Manager with 7 years of experience coordinating care for patients with complex chronic conditions across in-person and telehealth settings."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Waverly Integrated Kidney Care", jobTitle: "Registered Nurse Case Manager", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Manage care for patients facing late-stage CKD and ESRD, handling approximately 25 cases at a time\\nCoordinate with multidisciplinary teams, contributing to a 10% reduction in average length of stay\\nConduct both in-person and telehealth visits to maximize patient access to care" }, { id: crypto.randomUUID(), company: "Central University Teaching Hospital", jobTitle: "Registered Nurse", location: "", startDate: "2017", endDate: "2020", current: false, bullets: "Delivered nephrology-focused nursing care to 20+ patients per shift\\nEducated patients on dialysis self-management and treatment adherence" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Oklahoma State University", degree: "B.S. Nursing", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Case Management", rating: 4 }, { skill: "Chronic Disease Care", rating: 4 }, { skill: "Telehealth", rating: 4 }, { skill: "Care Coordination", rating: 4 }, { skill: "EHR", rating: 4 }
        ],
        descriptions: "Core Competencies: Case Management, Chronic Disease Care, Telehealth, Care Coordination, EHR"
      }
    } as TBResumeData  },
  {
    title: "Healthcare Administrator",
    category: "Healthcare",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Results-driven Healthcare Administrator with a track record of optimizing operational efficiency and reducing patient wait times through data-driven scheduling systems.",
    score: 96,
    tags: ["Healthcare Operations","Scheduling Systems","EHR Implementation"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "pikachu", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Marcus Webb", email: "marcus.webb@email.com", phone: "", location: "Denver, CO", website: "", linkedin: "", github: "", summary: "Results-driven Healthcare Administrator with a track record of optimizing operational efficiency and reducing patient wait times through data-driven scheduling systems."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Summit Ridge Medical Group", jobTitle: "Healthcare Administrator", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Reduced patient wait times by 35% through innovative scheduling systems\\nOversaw daily operations for a multi-specialty clinic serving 500+ patients weekly\\nLed implementation of new EHR system across 4 clinic locations" }, { id: crypto.randomUUID(), company: "Pinecrest Health Network", jobTitle: "Operations Coordinator", location: "", startDate: "2015", endDate: "2019", current: false, bullets: "Managed staff scheduling for a 60-person clinical team\\nImproved patient satisfaction scores by 20% through process redesign" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Colorado Denver", degree: "M.H.A. Healthcare Administration", location: "", startDate: "", endDate: "2015", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Healthcare Operations", rating: 4 }, { skill: "Scheduling Systems", rating: 4 }, { skill: "EHR Implementation", rating: 4 }, { skill: "Staff Management", rating: 4 }, { skill: "Compliance", rating: 4 }
        ],
        descriptions: "Core Competencies: Healthcare Operations, Scheduling Systems, EHR Implementation, Staff Management, Compliance"
      }
    } as TBResumeData  },
  {
    title: "Certified Nurse Practitioner",
    category: "Healthcare",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Certified Nurse Practitioner specializing in geriatric telemedicine, with a strong background in patient-centered care and interdisciplinary team leadership.",
    score: 86,
    tags: ["Geriatric Care","Telemedicine","Treatment Planning"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "rhyhorn", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Dr. Anika Reddy", email: "anika.reddy@email.com", phone: "", location: "Charlotte, NC", website: "", linkedin: "", github: "", summary: "Certified Nurse Practitioner specializing in geriatric telemedicine, with a strong background in patient-centered care and interdisciplinary team leadership."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Carolina Geriatric Partners", jobTitle: "Certified Nurse Practitioner", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Conduct independent patient assessments and prescribe treatment plans for a geriatric caseload of 300+ patients\\nLead interdisciplinary team managing complex chronic care cases\\nExpanded telemedicine services, increasing rural patient access by 45%" }, { id: crypto.randomUUID(), company: "Piedmont Family Health", jobTitle: "Registered Nurse", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Provided primary care support for a family medicine practice serving 1,000+ patients\\nCoordinated referrals and follow-up care across specialty providers" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Duke University", degree: "M.S. Nursing, Family Nurse Practitioner", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Geriatric Care", rating: 4 }, { skill: "Telemedicine", rating: 4 }, { skill: "Treatment Planning", rating: 4 }, { skill: "Interdisciplinary Leadership", rating: 4 }, { skill: "EHR", rating: 4 }
        ],
        descriptions: "Core Competencies: Geriatric Care, Telemedicine, Treatment Planning, Interdisciplinary Leadership, EHR"
      }
    } as TBResumeData  },
  {
    title: "Student Teacher",
    category: "Education",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Dedicated Student Teacher with classroom experience specializing in STEM curriculum development and personalized learning strategies.",
    score: 93,
    tags: ["Lesson Planning","Classroom Management","STEM Curriculum"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "scizor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Emma Sullivan", email: "emma.sullivan@email.com", phone: "", location: "Madison, WI", website: "", linkedin: "", github: "", summary: "Dedicated Student Teacher with classroom experience specializing in STEM curriculum development and personalized learning strategies."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Lakeside Elementary School", jobTitle: "Student Teacher", location: "", startDate: "2024", endDate: "2025", current: false, bullets: "Improved student engagement by 40% through data-driven, hands-on STEM lessons\\nSupported a culturally responsive classroom environment for 25 students\\nAssisted lead teacher in designing differentiated instruction for mixed-ability groups" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Wisconsin-Madison", degree: "B.A. Elementary Education", location: "", startDate: "", endDate: "2025", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Lesson Planning", rating: 4 }, { skill: "Classroom Management", rating: 4 }, { skill: "STEM Curriculum", rating: 4 }, { skill: "Differentiated Instruction", rating: 4 }
        ],
        descriptions: "Core Competencies: Lesson Planning, Classroom Management, STEM Curriculum, Differentiated Instruction"
      }
    } as TBResumeData  },
  {
    title: "Elementary School Teacher",
    category: "Education",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Dedicated Elementary School Teacher with 7+ years of experience and a track record of improving student reading scores through differentiated instruction.",
    score: 85,
    tags: ["Differentiated Instruction","Project-Based Learning","Classroom Technology"],
    data: {
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "classic", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Carlos Mendoza", email: "carlos.mendoza@email.com", phone: "", location: "San Diego, CA", website: "", linkedin: "", github: "", summary: "Dedicated Elementary School Teacher with 7+ years of experience and a track record of improving student reading scores through differentiated instruction."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Sunset Ridge Elementary", jobTitle: "3rd Grade Teacher", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Improved student reading scores by 25% through differentiated instruction and project-based learning\\nIntegrated educational technology into daily lessons, boosting engagement across the classroom\\nLed grade-level team in redesigning the reading curriculum" }, { id: crypto.randomUUID(), company: "Coastal View Elementary", jobTitle: "2nd Grade Teacher", location: "", startDate: "2016", endDate: "2019", current: false, bullets: "Fostered an inclusive classroom environment for 24 students with diverse learning needs\\nRan after-school tutoring program that improved struggling readers' scores by 18%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "San Diego State University", degree: "M.Ed. Elementary Education", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Differentiated Instruction", rating: 4 }, { skill: "Project-Based Learning", rating: 4 }, { skill: "Classroom Technology", rating: 4 }, { skill: "Curriculum Design", rating: 4 }
        ],
        descriptions: "Core Competencies: Differentiated Instruction, Project-Based Learning, Classroom Technology, Curriculum Design"
      }
    } as TBResumeData  },
  {
    title: "Special Education Teacher",
    category: "Education",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Dedicated Special Education Teacher with 12+ years of experience fostering inclusive learning environments through individualized education plans and assistive technology.",
    score: 95,
    tags: ["IEP Development","Assistive Technology","Trauma-Informed Practices"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Priya Nambiar", email: "priya.nambiar@email.com", phone: "", location: "Portland, OR", website: "", linkedin: "", github: "", summary: "Dedicated Special Education Teacher with 12+ years of experience fostering inclusive learning environments through individualized education plans and assistive technology."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Willamette Valley School District", jobTitle: "Special Education Teacher", location: "", startDate: "2015", endDate: "Present", current: true, bullets: "Increased student achievement by 35% through multi-sensory teaching strategies\\nManaged individualized education plans (IEPs) for a caseload of 20 students\\nLed district-wide neurodiversity inclusion initiative, training 25+ teachers" }, { id: crypto.randomUUID(), company: "Cedar Park School District", jobTitle: "Special Education Aide", location: "", startDate: "2011", endDate: "2015", current: false, bullets: "Supported classroom teachers in implementing IEP accommodations\\nAssisted in behavior intervention planning for students with diverse needs" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Portland State University", degree: "M.Ed. Special Education", location: "", startDate: "", endDate: "2011", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "IEP Development", rating: 4 }, { skill: "Assistive Technology", rating: 4 }, { skill: "Trauma-Informed Practices", rating: 4 }, { skill: "Behavior Intervention", rating: 4 }
        ],
        descriptions: "Core Competencies: IEP Development, Assistive Technology, Trauma-Informed Practices, Behavior Intervention"
      }
    } as TBResumeData  },
  {
    title: "High School Teacher, Career Changer",
    category: "Education",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Seasoned educator with 12+ years of experience transitioning into a career-change role, skilled in curriculum development and educational technology integration.",
    score: 90,
    tags: ["Curriculum Development","Educational Technology","Mentoring"],
    data: {
      customization: { font: "Helvetica", accentColor: "#d946ef", stylePreset: "executive", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Nathaniel Brooks", email: "nathaniel.brooks@email.com", phone: "", location: "Raleigh, NC", website: "", linkedin: "", github: "", summary: "Seasoned educator with 12+ years of experience transitioning into a career-change role, skilled in curriculum development and educational technology integration."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Ridgeline High School", jobTitle: "High School Teacher", location: "", startDate: "2013", endDate: "Present", current: true, bullets: "Consistently improved student performance through revised curriculum design\\nIntegrated adaptive learning technologies for 150+ students, increasing concept mastery by 25%\\nMentored 3 new teachers on classroom management and lesson planning" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "North Carolina State University", degree: "M.Ed. Secondary Education", location: "", startDate: "", endDate: "2013", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Curriculum Development", rating: 4 }, { skill: "Educational Technology", rating: 4 }, { skill: "Mentoring", rating: 4 }, { skill: "Classroom Management", rating: 4 }
        ],
        descriptions: "Core Competencies: Curriculum Development, Educational Technology, Mentoring, Classroom Management"
      }
    } as TBResumeData  },
  {
    title: "Academic Coordinator",
    category: "Education",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Seasoned Academic Coordinator with 10+ years of experience optimizing educational programs and student success initiatives across partner institutions.",
    score: 86,
    tags: ["Program Development","Student Success Analytics","Curriculum Standards"],
    data: {
      customization: { font: "Helvetica", accentColor: "#0f172a", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Dr. Samuel Kestrel", email: "samuel.kestrel@email.com", phone: "", location: "Nashville, TN", website: "", linkedin: "", github: "", summary: "Seasoned Academic Coordinator with 10+ years of experience optimizing educational programs and student success initiatives across partner institutions."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Tennessee Higher Education Consortium", jobTitle: "Academic Coordinator", location: "", startDate: "2017", endDate: "Present", current: true, bullets: "Led a cross-institutional collaboration that increased student retention rates by 25% across 5 partner universities\\nDesigned curriculum standards adopted across 12 academic departments\\nBuilt data dashboards tracking student success metrics for leadership review" }, { id: crypto.randomUUID(), company: "Cumberland State College", jobTitle: "Program Coordinator", location: "", startDate: "2012", endDate: "2017", current: false, bullets: "Managed academic advising program serving 800+ students\\nDeveloped early-intervention system that reduced first-year dropout rate by 15%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Vanderbilt University", degree: "Ed.D. Educational Leadership", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Program Development", rating: 4 }, { skill: "Student Success Analytics", rating: 4 }, { skill: "Curriculum Standards", rating: 4 }, { skill: "Academic Advising", rating: 4 }
        ],
        descriptions: "Core Competencies: Program Development, Student Success Analytics, Curriculum Standards, Academic Advising"
      }
    } as TBResumeData
  },
  {
    title: "Entry Level Project Manager",
    category: "Project Management",
    level: "Entry Level",
    levelColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Results-driven Entry Level Project Manager with 3+ years of experience in agile methodologies and cross-functional team coordination. Skilled in stakeholder communication and keeping deliverables on track.",
    score: 93,
    tags: ["Agile","Jira","Stakeholder Communication"],
    data: {
      customization: { font: "Helvetica", accentColor: "#93c5fd", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Lucas Ferreira", email: "lucas.ferreira@email.com", phone: "", location: "Charlotte, NC", website: "", linkedin: "", github: "", summary: "Results-driven Entry Level Project Manager with 3+ years of experience in agile methodologies and cross-functional team coordination. Skilled in stakeholder communication and keeping deliverables on track."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Brightline Consulting Group", jobTitle: "Associate Project Manager", location: "", startDate: "2023", endDate: "Present", current: true, bullets: "Coordinated cross-functional teams of 8+ across 3 concurrent client projects\\nImproved on-time delivery rate by 25% through better sprint planning and tracking in Jira\\nMaintained project documentation and status reporting for stakeholders across 5 departments" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of North Carolina at Charlotte", degree: "B.S. Business Administration", location: "", startDate: "", endDate: "2023", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Agile", rating: 4 }, { skill: "Jira", rating: 4 }, { skill: "Stakeholder Communication", rating: 4 }, { skill: "Risk Tracking", rating: 4 }, { skill: "Scheduling", rating: 4 }, { skill: "Scrum", rating: 4 }
        ],
        descriptions: "Core Competencies: Agile, Jira, Stakeholder Communication, Risk Tracking, Scheduling, Scrum"
      }
    } as TBResumeData  },
  {
    title: "Project Coordinator",
    category: "Project Management",
    level: "Mid Level",
    levelColor: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Project Coordinator with 8 years of experience orchestrating complex initiatives across multiple departments and stakeholders in fast-paced environments.",
    score: 87,
    tags: ["Project Coordination","Budget Tracking","Smartsheet"],
    data: {
      customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Danielle Osei", email: "danielle.osei@email.com", phone: "", location: "Columbus, OH", website: "", linkedin: "", github: "", summary: "Project Coordinator with 8 years of experience orchestrating complex initiatives across multiple departments and stakeholders in fast-paced environments."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Meridian Health Systems", jobTitle: "Senior Project Coordinator", location: "", startDate: "2020", endDate: "Present", current: true, bullets: "Managed documentation and scheduling for 12+ concurrent multi-million dollar initiatives\\nReduced meeting overhead by 30% by streamlining stakeholder reporting cadence\\nMaintained 98%+ accuracy in budget tracking and resource allocation records" }, { id: crypto.randomUUID(), company: "Larkspur Facilities Group", jobTitle: "Project Coordinator", location: "", startDate: "2017", endDate: "2020", current: false, bullets: "Tracked project milestones for a portfolio of 20+ facilities projects\\nFacilitated weekly cross-departmental status meetings with 15+ stakeholders" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Ohio State University", degree: "B.A. Business Management", location: "", startDate: "", endDate: "2016", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Project Coordination", rating: 4 }, { skill: "Budget Tracking", rating: 4 }, { skill: "Smartsheet", rating: 4 }, { skill: "Stakeholder Management", rating: 4 }, { skill: "Documentation", rating: 4 }
        ],
        descriptions: "Core Competencies: Project Coordination, Budget Tracking, Smartsheet, Stakeholder Management, Documentation"
      }
    } as TBResumeData  },
  {
    title: "Project Manager",
    category: "Project Management",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Technology-focused Project Manager specializing in digital transformation with over 10 years of experience across multiple industries.",
    score: 87,
    tags: ["Agile","Digital Transformation","Resource Allocation"],
    data: {
      customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "chikorita", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Andres Villareal", email: "andres.villareal@email.com", phone: "", location: "Austin, TX", website: "", linkedin: "", github: "", summary: "Technology-focused Project Manager specializing in digital transformation with over 10 years of experience across multiple industries."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Vantex Digital Solutions", jobTitle: "Project Manager", location: "", startDate: "2019", endDate: "Present", current: true, bullets: "Led cross-functional teams that reduced implementation timelines by 35% through strategic resource allocation\\nManaged $5M+ project portfolio across 6 concurrent digital transformation initiatives\\nImplemented agile ceremonies that improved sprint predictability by 20%" }, { id: crypto.randomUUID(), company: "Redstone IT Partners", jobTitle: "Project Coordinator", location: "", startDate: "2015", endDate: "2019", current: false, bullets: "Supported delivery of 15+ client projects ranging from $200K to $1.5M in scope\\nBuilt reporting dashboards that improved stakeholder visibility into project health" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Texas at Austin", degree: "B.S. Information Systems", location: "", startDate: "", endDate: "2015", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Agile", rating: 4 }, { skill: "Digital Transformation", rating: 4 }, { skill: "Resource Allocation", rating: 4 }, { skill: "Jira", rating: 4 }, { skill: "Risk Management", rating: 4 }, { skill: "PMP", rating: 4 }
        ],
        descriptions: "Core Competencies: Agile, Digital Transformation, Resource Allocation, Jira, Risk Management, PMP"
      }
    } as TBResumeData  },
  {
    title: "Senior Technical Project Manager",
    category: "Project Management",
    level: "Lead",
    levelColor: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "Senior Technical Project Manager with 12+ years of experience driving complex, cross-functional initiatives in cloud and AI technologies.",
    score: 93,
    tags: ["Technical Project Management","Cloud Migration","Agile/Scrum"],
    data: {
      customization: { font: "Helvetica", accentColor: "#475569", stylePreset: "ditgar", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Rebecca Lindholm", email: "rebecca.lindholm@email.com", phone: "", location: "Seattle, WA", website: "", linkedin: "", github: "", summary: "Senior Technical Project Manager with 12+ years of experience driving complex, cross-functional initiatives in cloud and AI technologies."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Orion Cloud Technologies", jobTitle: "Senior Technical Project Manager", location: "", startDate: "2018", endDate: "Present", current: true, bullets: "Orchestrated cloud migration initiative for a Fortune 500 client, delivering on time and 8% under budget\\nLed distributed team of 25+ engineers across 4 time zones on a mission-critical platform rebuild\\nReduced technical debt backlog by 30% by embedding risk management into sprint planning" }, { id: crypto.randomUUID(), company: "Ferncrest Data Systems", jobTitle: "Technical Project Manager", location: "", startDate: "2013", endDate: "2018", current: false, bullets: "Managed delivery of 10+ enterprise software integrations valued at $500K-$2M each\\nCoordinated with engineering, QA, and product teams to reduce release defects by 22%" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "University of Washington", degree: "B.S. Computer Science", location: "", startDate: "", endDate: "2012", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Technical Project Management", rating: 4 }, { skill: "Cloud Migration", rating: 4 }, { skill: "Agile/Scrum", rating: 4 }, { skill: "Risk Management", rating: 4 }, { skill: "Stakeholder Communication", rating: 4 }, { skill: "PMP", rating: 4 }
        ],
        descriptions: "Core Competencies: Technical Project Management, Cloud Migration, Agile/Scrum, Risk Management, Stakeholder Communication, PMP"
      }
    } as TBResumeData  },
  {
    title: "Senior Infrastructure Project Manager",
    category: "Project Management",
    level: "Executive",
    levelColor: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Seasoned Infrastructure Project Manager with 12+ years of experience orchestrating complex, large-scale projects. Adept at leveraging agile methodologies and cloud technologies to drive digital transformation.",
    score: 95,
    tags: ["Infrastructure Delivery","PRINCE2","Risk Management"],
    data: {
      customization: { font: "Helvetica", accentColor: "#3b82f6", stylePreset: "ditto", pageWidth: "standard", fontSize: "medium", layout: "single" },
      sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
      hiddenSections: [],
      customSections: [],
      profile: {
        name: "Vikram Choudhury", email: "vikram.choudhury@email.com", phone: "", location: "Bangalore, India", website: "", linkedin: "", github: "", summary: "Seasoned Infrastructure Project Manager with 12+ years of experience orchestrating complex, large-scale projects. Adept at leveraging agile methodologies and cloud technologies to drive digital transformation."
      },
      workExperiences: [
        { id: crypto.randomUUID(), company: "Nexterra Infrastructure Group", jobTitle: "Senior Project Manager", location: "", startDate: "2017", endDate: "Present", current: true, bullets: "Led delivery of a $40M data center modernization program across 3 regions\\nManaged a team of 6 project managers overseeing a combined portfolio of $80M\\nReduced project delivery variance by 25% through improved risk and schedule management practices" }, { id: crypto.randomUUID(), company: "Solstice Engineering Partners", jobTitle: "Project Manager", location: "", startDate: "2012", endDate: "2017", current: false, bullets: "Delivered 8 large-scale infrastructure projects on time and within budget\\nIntroduced standardized project governance framework adopted company-wide" }
      ],
      educations: [
        { id: crypto.randomUUID(), school: "Indian Institute of Management Ahmedabad", degree: "MBA, Operations Management", location: "", startDate: "", endDate: "2011", gpa: "", coursework: "" }
      ],
      projects: [],
      skills: {
        featuredSkills: [
          { skill: "Infrastructure Delivery", rating: 4 }, { skill: "PRINCE2", rating: 4 }, { skill: "Risk Management", rating: 4 }, { skill: "Program Governance", rating: 4 }, { skill: "Stakeholder Management", rating: 4 }, { skill: "Budgeting", rating: 4 }
        ],
        descriptions: "Core Competencies: Infrastructure Delivery, PRINCE2, Risk Management, Program Governance, Stakeholder Management, Budgeting"
      }
    } as TBResumeData
  }
];
