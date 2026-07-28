import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const softwareEngineerData: RolePageData = {
  slug: "software-engineer",
  title: "Software Engineer",
  category: "Engineering",
  pageTitle: "6 Software Engineer Resume Examples & Tips for 2025",
  metaDescription: "Browse professionally written software engineer resume examples. Discover what skills to include, how to structure your experience, and get expert tips to land more tech interviews.",
  
  marketInsights: {
    medianSalary: "$120,000 – $185,000",
    education: "B.S. Computer Science or equivalent",
    yearsExperience: "0–8+ years",
    workStyle: "Hybrid / Remote",
    careerPath: "Intern → SWE I → SWE II → Senior SWE → Staff/Principal",
    certifications: ["AWS Certified Developer", "Google Cloud Professional", "CKA"],
  },

  examples: [
    {
      id: "swe-senior",
      persona: {
        name: "Priya Desai",
        location: "New York, NY",
        email: "priya.desai@email.com",
      },
      headline: "Senior Software Engineer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#1e3a5f", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Priya Desai", 
          email: "priya.desai@email.com", 
          phone: "(212) 555-0199", 
          location: "New York, NY", 
          website: "priyadesai.dev", 
          linkedin: "linkedin.com/in/priyadesaiswe", 
          github: "github.com/pdesai", 
          summary: "Senior Backend Software Engineer with 7+ years of experience architecting highly scalable microservices and distributed systems. Expert in Go, Python, and AWS infrastructure, with a track record of leading cross-functional teams to deliver critical infrastructure that supports millions of concurrent users with 99.99% uptime."
        },
        workExperiences: [
          { 
            id: "swe-we-1", 
            company: "FinStream Inc.", 
            jobTitle: "Senior Software Engineer", 
            location: "New York, NY", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Architected and led the migration of a monolithic payment processing service into 5 scalable Go microservices, reducing transaction latency by 45%.\nSpearheaded the implementation of a real-time event streaming architecture using Apache Kafka, successfully processing over 10M daily events with zero data loss.\nMentored 4 junior and mid-level engineers, leading weekly system design reviews and establishing internal best practices for CI/CD pipelines via GitHub Actions.\nOptimized PostgreSQL database schemas and indexing strategies, decreasing query execution time for the core reporting dashboard from 4s to 250ms." 
          },
          { 
            id: "swe-we-2", 
            company: "DataCloud Solutions", 
            jobTitle: "Software Engineer II", 
            location: "Austin, TX", 
            startDate: "Jan 2018", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Developed scalable RESTful APIs in Python using FastAPI, serving as the backbone for the company's flagship analytics platform utilized by 500+ enterprise clients.\nContainerized legacy applications using Docker and orchestrated deployments on Kubernetes (EKS), reducing infrastructure costs by 22% through better resource utilization.\nImplemented comprehensive unit and integration testing suites using PyTest, raising overall code coverage from 55% to 92% and cutting production bugs by 30%." 
          }
        ],
        educations: [
          { 
            id: "swe-ed-1", 
            school: "Georgia Institute of Technology", 
            degree: "M.S. Computer Science (Machine Learning Specialization)", 
            location: "Atlanta, GA", 
            startDate: "Aug 2016", 
            endDate: "Dec 2017", 
            gpa: "3.9", 
            coursework: "Distributed Systems, Advanced Algorithms, Machine Learning, Database Design" 
          }
        ],
        projects: [
          {
            id: "swe-proj-1",
            name: "OpenStream",
            tech: "Go, gRPC, Redis",
            link: "github.com/pdesai/openstream",
            date: "2023",
            bullets: "Created an open-source, high-throughput rate-limiting service built in Go, designed for distributed microservices.\nAdopted by 3 startup engineering teams and garnered over 800 stars on GitHub."
          },
          {
            id: "swe-proj-2",
            name: "Cloud Cost CLI",
            tech: "Python, AWS Boto3",
            link: "priyadesai.dev/cost-cli",
            date: "2022",
            bullets: "Developed a CLI tool to identify orphaned AWS resources and generate cost-savings reports, saving $2,000/month for a previous employer."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Go (Golang)", rating: 5 },
            { skill: "System Design", rating: 5 },
            { skill: "AWS Infrastructure", rating: 5 },
            { skill: "Python", rating: 4 },
            { skill: "Kubernetes", rating: 4 },
            { skill: "PostgreSQL", rating: 5 }
          ],
          descriptions: "Programming Languages: Go (Golang), Python, JavaScript/TypeScript, SQL, Bash\nBackend & Architecture: Microservices, REST APIs, gRPC, Event-Driven Architecture, Apache Kafka, Redis, PostgreSQL\nCloud & DevOps: AWS (EC2, S3, RDS, Lambda), Kubernetes (EKS), Docker, Terraform, GitHub Actions, Datadog"
        }
      },
      critique: "A phenomenal senior engineering resume that leads with profound technical impact. Notice how every bullet point pairs a highly technical action (e.g., 'event streaming architecture using Apache Kafka') with a massive, quantifiable business result ('processing over 10M daily events'). Furthermore, highlighting mentorship ('Mentored 4 junior engineers') is exactly what engineering managers look for in Senior candidates."
    },
    {
      id: "swe-fullstack",
      persona: {
        name: "James Okafor",
        location: "Austin, TX",
        email: "james.okafor@email.com",
      },
      headline: "Full-Stack Engineer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "James Okafor", 
          email: "james.okafor@email.com", 
          phone: "(512) 555-8822", 
          location: "Austin, TX", 
          website: "jamesokafor.tech", 
          linkedin: "linkedin.com/in/jamesokafor", 
          github: "github.com/jamesok", 
          summary: "Product-minded Full-Stack Engineer with 4 years of experience building responsive, accessible web applications using React, Next.js, and Node.js. Passionate about bridging the gap between elegant UI design and robust backend architecture to deliver exceptional user experiences."
        },
        workExperiences: [
          { 
            id: "swe-we-3", 
            company: "E-Commerce Solutions LLC", 
            jobTitle: "Software Engineer", 
            location: "Austin, TX", 
            startDate: "Sep 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Led the frontend rewrite of the primary customer checkout flow using Next.js and Tailwind CSS, improving Lighthouse performance scores by 35 points.\nBuilt and integrated a secure, serverless Stripe payment processing backend using Node.js and AWS Lambda, processing $5M+ in monthly transactions securely.\nImplemented a unified design system and reusable component library in React/Storybook, reducing UI development time for new features by an estimated 30%.\nCollaborated directly with the Product Management team to define technical requirements and establish bi-weekly sprint velocity targets in Jira." 
          },
          { 
            id: "swe-we-4", 
            company: "StartupStudio", 
            jobTitle: "Junior Full-Stack Developer", 
            location: "Dallas, TX", 
            startDate: "Jun 2019", 
            endDate: "Aug 2021", 
            current: false, 
            bullets: "Developed responsive web applications for 4 early-stage startups using the MERN stack (MongoDB, Express, React, Node.js).\nIntegrated third-party APIs including Twilio for SMS notifications and SendGrid for automated email campaigns, boosting user engagement by 15%.\nSet up initial CI/CD workflows utilizing GitHub Actions and Vercel for automated frontend previews on every pull request." 
          }
        ],
        educations: [
          { 
            id: "swe-ed-2", 
            school: "University of Texas at Dallas", 
            degree: "B.S. Software Engineering", 
            location: "Richardson, TX", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.6", 
            coursework: "Web Development, Data Structures, Algorithms, Software Testing, HCI" 
          }
        ],
        projects: [
          {
            id: "swe-proj-3",
            name: "DevBoard Tracker",
            tech: "Next.js, TypeScript, Supabase",
            link: "devboard.jamesokafor.tech",
            date: "2023",
            bullets: "Built a fully functional Kanban board application featuring real-time collaborative editing using Supabase real-time subscriptions.\nImplemented secure OAuth authentication and row-level security policies for user data isolation."
          },
          {
            id: "swe-proj-4",
            name: "React Accessible Tabs",
            tech: "React, TypeScript, NPM",
            link: "npmjs.com/package/react-a11y-tabs",
            date: "2022",
            bullets: "Authored an open-source, WAI-ARIA compliant tab component for React with full keyboard navigation support, downloaded over 10k times."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "React / Next.js", rating: 5 },
            { skill: "TypeScript", rating: 5 },
            { skill: "Node.js", rating: 4 },
            { skill: "Tailwind CSS", rating: 5 },
            { skill: "MongoDB / SQL", rating: 4 },
            { skill: "AWS Serverless", rating: 3 }
          ],
          descriptions: "Frontend: React, Next.js, TypeScript, JavaScript (ES6+), HTML5, CSS3, Tailwind CSS, Redux, Storybook\nBackend: Node.js, Express.js, RESTful APIs, Serverless (AWS Lambda)\nDatabase & Tools: PostgreSQL, MongoDB, Supabase, Git, GitHub Actions, Vercel, Webpack/Vite"
        }
      },
      critique: "A superb full-stack resume that proves competency across the entire stack. Instead of just listing languages, the candidate demonstrates UI/UX awareness ('improving Lighthouse performance scores', 'unified design system') alongside backend security and architecture ('serverless Stripe payment processing'). The inclusion of a highly relevant side-project (Kanban board with real-time sync) heavily reinforces their React and Supabase skills."
    },
    {
      id: "swe-new-grad",
      persona: {
        name: "Mei Lin",
        location: "San Jose, CA",
        email: "mei.lin@email.com",
      },
      headline: "New Grad Software Engineer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Mei Lin", 
          email: "mei.lin@email.com", 
          phone: "(408) 555-1234", 
          location: "San Jose, CA", 
          website: "meilin.io", 
          linkedin: "linkedin.com/in/meilinswe", 
          github: "github.com/meilin99", 
          summary: "Recent Computer Science graduate with a strong foundation in algorithms and full-stack web development. Proven ability to quickly learn new technologies and deliver production-ready code through software engineering internships at top tech companies. Passionate about building accessible, performant web applications."
        },
        workExperiences: [
          { 
            id: "swe-we-5", 
            company: "Tech Giant Corp", 
            jobTitle: "Software Engineering Intern", 
            location: "Sunnyvale, CA", 
            startDate: "May 2023", 
            endDate: "Aug 2023", 
            current: false, 
            bullets: "Developed a new internal metrics dashboard using React and Redux, providing real-time visibility into CI/CD build times for 500+ engineers.\nOptimized backend GraphQL queries in Node.js, reducing the dashboard's initial load time by 40% and cutting down on unnecessary database fetches.\nCollaborated closely with a senior engineer mentor to write comprehensive unit tests using Jest, achieving 95% code coverage on all new features." 
          },
          { 
            id: "swe-we-6", 
            company: "University Research Lab", 
            jobTitle: "Undergraduate Research Assistant", 
            location: "San Jose, CA", 
            startDate: "Sep 2022", 
            endDate: "May 2023", 
            current: false, 
            bullets: "Assisted in the development of a Python-based computer vision tool using OpenCV to analyze cellular structures in medical imaging data.\nRefactored legacy data-processing scripts, improving processing speeds by 2x and making the codebase modular and readable." 
          }
        ],
        educations: [
          { 
            id: "swe-ed-3", 
            school: "San Jose State University", 
            degree: "B.S. Computer Science", 
            location: "San Jose, CA", 
            startDate: "Aug 2020", 
            endDate: "May 2024", 
            gpa: "3.85 / 4.0", 
            coursework: "Data Structures, Algorithms, Operating Systems, Database Management, Web Systems, Software Engineering" 
          }
        ],
        projects: [
          {
            id: "swe-proj-5",
            name: "StudySync App",
            tech: "React Native, Firebase",
            link: "github.com/meilin99/studysync",
            date: "2024",
            bullets: "Led a team of 3 students to build a mobile application that helps students organize study groups and share notes.\nImplemented real-time chat functionality using Firebase Cloud Firestore and push notifications."
          },
          {
            id: "swe-proj-6",
            name: "Algorithmic Trading Bot",
            tech: "Python, Pandas, Alpaca API",
            link: "github.com/meilin99/trade-bot",
            date: "2023",
            bullets: "Built a paper-trading bot in Python that executes trades based on moving average crossover strategies using historical market data."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Python", rating: 5 },
            { skill: "JavaScript / ES6", rating: 4 },
            { skill: "React", rating: 4 },
            { skill: "Java", rating: 3 },
            { skill: "SQL", rating: 4 },
            { skill: "Git / GitHub", rating: 5 }
          ],
          descriptions: "Languages: Python, JavaScript, TypeScript, Java, C++, SQL, HTML/CSS\nFrameworks & Libraries: React, Node.js, Express, React Native, Redux, Pandas, OpenCV\nTools & Platforms: Git, GitHub, Firebase, Linux/Unix, Jest, Docker (Basic)"
        }
      },
      critique: "New Grad resumes often suffer from a lack of real-world experience, but this resume completely avoids that trap. It heavily leverages an impactful internship ('reducing initial load time by 40%'), relevant academic research, and impressive group projects. Including relevant coursework and a strong GPA immediately establishes foundational competence."
    }
  ],

  writingGuide: {
    intro: "Writing a Software Engineer resume requires treating your resume like a piece of high-quality code. Your users are recruiters and engineering managers; your core features are your technical depth, problem-solving skills, and the scale of your impact. Focus on outcomes over output, and always back up your claims with hard data and specific technologies.",
    tips: [
      "Quantify your technical impact using metrics like latency reduction, performance scores, system uptime, or active users.",
      "Always include your tech stack in your bullet points (e.g., 'Built a caching layer using Redis' instead of 'Built a caching layer').",
      "Lead with strong action verbs like 'Architected', 'Deployed', 'Optimized', and 'Scaled'.",
      "Include active links to your GitHub profile and live projects so hiring managers can actually read your code."
    ],
    headlineExamples: [
      {
        strong: "Senior Software Engineer | Distributed Systems & Go | Scaled to 1M+ Users",
        weak: "Software Engineer",
        explanation: "A strong headline gives the recruiter immediate context about your seniority, primary stack, and the scale you've operated at."
      },
      {
        strong: "Full-Stack Developer | React & Node.js | E-commerce Expert",
        weak: "Web Developer",
        explanation: "Be specific about your exact tech stack and your domain expertise rather than using generic titles."
      }
    ],
    summaryExamples: [
      {
        strong: "Backend software engineer with 5+ years of experience designing high-throughput microservices in Go and Python. Proven track record of optimizing cloud infrastructure on AWS, resulting in 30% cost savings and 99.99% uptime for enterprise SaaS platforms.",
        weak: "I am a hardworking software engineer who loves coding and building apps. I know Python, Java, and C++. Looking for a challenging role in a good company.",
        explanation: "The strong summary immediately establishes the stack, the domain, and concrete business outcomes. The weak summary is generic, uses subjective words ('hardworking', 'loves coding'), and focuses on what the candidate wants rather than the value they provide."
      }
    ],
    bulletGuidance: "When writing your experience bullets, always use the STAR method (Situation, Task, Action, Result) but compress it into a single line. Start with a strong action verb, describe the technical implementation, and end with the measurable business or technical impact. For example: 'Optimized PostgreSQL database schemas and indexing strategies, decreasing query execution time for the core reporting dashboard from 4s to 250ms.'",
    expertQuote: "The best engineering resumes I see don't just list technologies like a dictionary. They tell a story of how those technologies were used to solve real business problems at scale.",
    faq: [
      {
        q: "Should I include my GPA as a new grad?",
        a: "Yes, if your GPA is 3.5 or higher, you should include it on your resume as it signals a strong academic foundation. If it's below 3.0, it's generally better to omit it and focus on your projects and internships."
      },
      {
        q: "How many pages should my software engineer resume be?",
        a: "For the vast majority of engineers (0-10 years of experience), your resume should be exactly one page. Hiring managers skim resumes in seconds; keep it concise and impactful. Only consider a two-page resume if you are a Staff/Principal engineer with 15+ years of highly relevant, diverse experience."
      },
      {
        q: "Do personal projects matter for senior engineers?",
        a: "Generally, no. For senior engineers, your professional experience and system design impact matter far more. However, if you have a highly successful open-source project or a complex side-hustle with real users, it's worth including. For juniors and new grads, personal projects are absolutely critical."
      },
      {
        q: "Should I list every programming language I've ever touched?",
        a: "No. Only list languages and frameworks you are comfortable interviewing in. Listing 20 languages signals to a hiring manager that you have superficial knowledge of many, rather than deep expertise in a few core technologies."
      }
    ],
    relatedRoles: [
      { title: "Frontend Engineer", slug: "frontend-engineer" },
      { title: "Backend Engineer", slug: "backend-engineer" },
      { title: "DevOps Engineer", slug: "devops-engineer" },
      { title: "Data Engineer", slug: "data-engineer" }
    ]
  }
};
