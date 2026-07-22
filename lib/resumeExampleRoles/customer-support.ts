import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const customerSupportData: RolePageData = {
  slug: "customer-support",
  title: "Customer Support Specialist",
  category: "Customer Support",
  pageTitle: "5 Customer Support & Service Resume Examples for 2025",
  metaDescription: "Browse professionally written Customer Support resume examples. Learn how to highlight CSAT scores, Zendesk/Salesforce Service Cloud expertise, ticket resolution time, and retention.",
  
  marketInsights: {
    medianSalary: "$45,000 – $80,000",
    education: "Associate or Bachelor's degree preferred",
    yearsExperience: "1–5+ years",
    workStyle: "Remote / Hybrid",
    careerPath: "Support Rep → Senior Support Specialist → Customer Support Lead → Support Manager → Head of CX",
    certifications: ["Zendesk Support Certified Administrator", "HubSpot Service Hub Certification", "ITIL Foundation"],
  },

  examples: [
    {
      id: "cs-lead",
      persona: {
        name: "Daniela Cruz",
        location: "Phoenix, AZ",
        email: "daniela.cruz@email.com",
      },
      headline: "Customer Support Lead & CX Specialist",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#0284c7", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Daniela Cruz", 
          email: "daniela.cruz@email.com", 
          phone: "(602) 555-0144", 
          location: "Phoenix, AZ", 
          website: "", 
          linkedin: "linkedin.com/in/danielacruz-cx", 
          github: "", 
          summary: "Customer Experience Lead with 5+ years of experience managing omnichannel support operations across Zendesk, Salesforce Service Cloud, and Intercom. Maintained a 98.4% personal CSAT score while leading a tier-2 support team of 8 representatives. Specialized in macros creation, ticket resolution speed, and escalation management."
        },
        workExperiences: [
          { 
            id: "cs-we-1", 
            company: "CloudPay Solutions", 
            jobTitle: "Customer Support Team Lead", 
            location: "Phoenix, AZ", 
            startDate: "Feb 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Lead a team of 8 Tier-2 support reps resolving 1,200+ weekly technical tickets via email, live chat, and phone.\nAchieved an average team CSAT score of 97.5% (industry benchmark 90%) through weekly ticket audits and coaching.\nReduced average First Response Time (FRT) from 45 minutes to 12 minutes by optimizing Zendesk macros and triggers." 
          },
          { 
            id: "cs-we-2", 
            company: "OmniDesk Tech", 
            jobTitle: "Senior Support Representative", 
            location: "Phoenix, AZ", 
            startDate: "Jan 2019", 
            endDate: "Jan 2022", 
            current: false, 
            bullets: "Resolved 60+ tickets daily with a 98.4% CSAT rating, earning Representative of the Quarter twice.\nAuthored 50+ internal knowledge base articles in Confluence, empowering self-service and reducing incoming ticket volume by 15%." 
          }
        ],
        educations: [
          { 
            id: "cs-ed-1", 
            school: "Arizona State University", 
            degree: "B.S. Communication", 
            location: "Tempe, AZ", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.65", 
            coursework: "Interpersonal Dynamics, Conflict Resolution, Digital Communication" 
          }
        ],
        projects: [
          {
            id: "cs-proj-1",
            name: "Zendesk AI Chatbot Integration",
            tech: "Zendesk Answer Bot, Ada",
            link: "",
            date: "2023",
            bullets: "Configured automated AI chat deflection workflows, deflecting 22% of tier-1 repetitive password reset requests."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Zendesk / Intercom / Salesforce", rating: 5 },
            { skill: "CSAT & Net Promoter Score (NPS)", rating: 5 },
            { skill: "First Response Time (FRT) Optimization", rating: 5 },
            { skill: "Knowledge Base (KCS) Authoring", rating: 4 },
            { skill: "Escalation & Conflict Resolution", rating: 5 },
            { skill: "Jira / Confluence / Slack", rating: 4 }
          ],
          descriptions: "Helpdesk Software: Zendesk Support/Guide, Intercom, Salesforce Service Cloud, Freshdesk, ServiceNow\nMetrics & Skills: CSAT, NPS, FRT, Resolution Time, Ticket Deflection, KCS Knowledge Base, Tier-2 Technical Escalations"
        }
      },
      critique: "A fantastic Customer Support resume that showcases metrics upfront (97.5% team CSAT, 12 min FRT, 60+ tickets daily) and highlights mastery of key helpdesk software like Zendesk and Intercom."
    },
    {
      id: "cs-csm-tech",
      persona: {
        name: "Kevin Patel",
        location: "Denver, CO",
        email: "kevin.patel@email.com",
      },
      headline: "Customer Success Manager (SaaS)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Kevin Patel", 
          email: "kevin.patel@email.com", 
          phone: "(303) 555-0182", 
          location: "Denver, CO", 
          website: "", 
          linkedin: "linkedin.com/in/kevinpatel-csm", 
          github: "", 
          summary: "Customer Success Manager with 4+ years of experience managing a $3.5M ARR portfolio of enterprise B2B SaaS accounts. Maintained a 115% Net Retention Rate (NRR) and under 4% annual logo churn. Skilled in Gainsight, Executive Business Reviews (EBR), and expansion upsells."
        },
        workExperiences: [
          { 
            id: "cs-we-3", 
            company: "DataMetrics SaaS", 
            jobTitle: "Enterprise Customer Success Manager", 
            location: "Denver, CO", 
            startDate: "Aug 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Manage relationships and product adoption for 35 enterprise accounts totaling $3.5M in ARR.\nAchieved 115% Net Retention Rate (NRR) in 2023 by identifying expansion and upsell opportunities during Executive Business Reviews (EBRs).\nDecreased onboarding time for new enterprise clients from 60 days to 32 days using Gainsight journey playbooks." 
          }
        ],
        educations: [
          { 
            id: "cs-ed-2", 
            school: "University of Colorado Boulder", 
            degree: "B.S. Business Administration", 
            location: "Boulder, CO", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.7", 
            coursework: "Account Management, SaaS Business Models, Public Speaking" 
          }
        ],
        projects: [
          {
            id: "cs-proj-2",
            name: "Enterprise Health Score Dashboard",
            tech: "Gainsight, Salesforce, Tableau",
            link: "",
            date: "2023",
            bullets: "Built early-warning account risk scoring model in Gainsight, reducing unexpected churn by 20%."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Gainsight & Totango", rating: 5 },
            { skill: "Net Retention Rate (NRR) Growth", rating: 5 },
            { skill: "Executive Business Reviews (EBR)", rating: 5 },
            { skill: "Salesforce CRM", rating: 4 },
            { skill: "Onboarding & Adoption Playbooks", rating: 5 },
            { skill: "Account Churn Reduction", rating: 4 }
          ],
          descriptions: "CS Platforms: Gainsight, Totango, ChurnZero, Salesforce CRM, HubSpot\nKey Metrics: Net Retention Rate (115%), Logo Churn (<4%), Product Adoption, Time-to-Value (TTV), Health Scores"
        }
      },
      critique: "A high-impact CSM resume using the Onyx dark preset. Focuses on revenue retention (115% NRR), account portfolio size ($3.5M ARR), and Gainsight software mastery."
    },
    {
      id: "cs-tech-support-eng",
      persona: {
        name: "Samantha Lee",
        location: "Seattle, WA",
        email: "samantha.lee@email.com",
      },
      headline: "Technical Support Engineer (L2/L3)",
      resumeData: {
        customization: { font: "Courier", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Samantha Lee", 
          email: "samantha.lee@email.com", 
          phone: "(206) 555-0199", 
          location: "Seattle, WA", 
          website: "samanthalee.dev", 
          linkedin: "linkedin.com/in/samanthalee-tse", 
          github: "github.com/samlee-tse", 
          summary: "Technical Support Engineer with 4+ years of experience troubleshooting REST APIs, SQL database queries, and cloud microservice logs for developer-focused SaaS products. Skilled in Postman, Datadog, Python, and Jira Service Management."
        },
        workExperiences: [
          { 
            id: "cs-we-4", 
            company: "APICloud Inc", 
            jobTitle: "Tier-3 Technical Support Engineer", 
            location: "Seattle, WA", 
            startDate: "Jan 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Diagnose and resolve complex API integration bugs and SDK errors escalated by Tier-1/2 support, maintaining a 96% SLA compliance rate.\nInspect Datadog APM traces and AWS CloudWatch logs to isolate backend microservice latency issues.\nWrite Python scripts and SQL queries to reproduce candidate issues and verify bug fixes before submitting Jira tickets to core engineering." 
          }
        ],
        educations: [
          { 
            id: "cs-ed-3", 
            school: "University of Washington", 
            degree: "B.S. Informatics", 
            location: "Seattle, WA", 
            startDate: "Sep 2016", 
            endDate: "Jun 2020", 
            gpa: "3.75", 
            coursework: "Database Systems, Web Development, Networks & Security" 
          }
        ],
        projects: [
          {
            id: "cs-proj-3",
            name: "API Log Parser CLI Tool",
            tech: "Python, Postman, Datadog",
            link: "github.com/samlee-tse/log-parser",
            date: "2023",
            bullets: "Created internal CLI tool for support engineers to parse JSON payload logs, reducing triage time by 35%."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "REST API Debugging & Postman", rating: 5 },
            { skill: "SQL Querying & PostgreSQL", rating: 5 },
            { skill: "Datadog & CloudWatch Logs", rating: 4 },
            { skill: "Python / Bash Scripting", rating: 4 },
            { skill: "Jira Service Management", rating: 5 },
            { skill: "SLA Adherence & Escalations", rating: 5 }
          ],
          descriptions: "Technical Tools: Postman, Datadog, AWS CloudWatch, Wireshark, SQL, Python, Git, Curl\nHelpdesk & Triage: Jira Service Desk, Zendesk, ServiceNow, PagerDuty, Incident Management"
        }
      },
      critique: "A sharp, technical support resume built on the Modern preset. Highlights developer support skills (APIs, SQL, Datadog logs) and Jira bug triage."
    }
  ],

  writingGuide: {
    intro: "A great Customer Support resume proves efficiency, empathy, and technical software fluency. Focus on CSAT scores, ticket volumes, response times, and helpdesk platform expertise.",
    tips: [
      "Always state your personal or team CSAT score (e.g., '98.4% CSAT rating').",
      "Quantify ticket volume handled per day or week (e.g., 'Resolved 60+ tickets daily').",
      "List helpdesk tools explicitly (Zendesk, Intercom, Salesforce, Freshdesk)."
    ],
    headlineExamples: [
      {
        strong: "Customer Support Lead | Zendesk Certified | 98.4% CSAT | Tier-2 Escalations",
        weak: "Support rep looking for customer service job",
        explanation: "Shows leadership, platform certification, CSAT score, and escalation level immediately."
      }
    ],
    summaryExamples: [
      {
        strong: "Customer Experience Lead with 5+ years of experience managing omnichannel support operations in Zendesk and Intercom. Maintained 98.4% CSAT while cutting response times by 70%.",
        weak: "Friendly customer service representative who loves solving problems for customers.",
        explanation: "Replaces vague claims with concrete CSAT scores and response time reductions."
      }
    ],
    bulletGuidance: "Use: Metric + Tool + Ticket Volume + Outcome. Example: 'Reduced average First Response Time (FRT) from 45 minutes to 12 minutes by optimizing Zendesk macros.'",
    expertQuote: "Helpdesk managers look for CSAT consistency and familiarity with ticket tools.",
    faq: [
      {
        q: "What helpdesk certifications are recommended?",
        a: "Zendesk Support Administrator and HubSpot Service Hub certifications carry strong weight."
      }
    ],
    relatedRoles: [
      { title: "Customer Success Manager (CSM)", slug: "csm" },
      { title: "Technical Support Engineer", slug: "technical-support-engineer" },
      { title: "Client Services Specialist", slug: "client-services-specialist" }
    ]
  }
};
