import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const marketingData: RolePageData = {
  slug: "marketing",
  title: "Marketing Specialist",
  category: "Marketing",
  pageTitle: "5 Marketing Resume Examples & Writing Tips for 2025",
  metaDescription: "Browse professionally written Marketing resume examples. Learn how to highlight ROAS, CAC reduction, content strategy, SEO, and paid growth metrics.",
  
  marketInsights: {
    medianSalary: "$68,000 – $125,000",
    education: "Bachelor's degree in Marketing, Communications, or Business",
    yearsExperience: "2–8+ years",
    workStyle: "Hybrid / Remote",
    careerPath: "Marketing Coordinator → Marketing Specialist → Senior Marketing Manager → Director of Marketing → CMO",
    certifications: ["Google Ads Certification", "HubSpot Content Marketing", "Meta Certified Digital Marketing Associate"],
  },

  examples: [
    {
      id: "mkt-growth-manager",
      persona: {
        name: "Chloe Bennett",
        location: "Los Angeles, CA",
        email: "chloe.bennett@email.com",
      },
      headline: "Senior Growth Marketing Manager",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#ec4899", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Chloe Bennett", 
          email: "chloe.bennett@email.com", 
          phone: "(310) 555-0166", 
          location: "Los Angeles, CA", 
          website: "chloebennett.marketing", 
          linkedin: "linkedin.com/in/chloebennett-growth", 
          github: "", 
          summary: "Data-driven Senior Growth Marketing Manager with 6+ years of experience scaling acquisition channels for D2C and SaaS brands. Proven track record of managing $2M+ annual paid ad spend across Meta, Google Ads, and TikTok with a 3.8x average ROAS. Reduced Customer Acquisition Cost (CAC) by 28% while doubling monthly lead volume."
        },
        workExperiences: [
          { 
            id: "mkt-we-1", 
            company: "LuxeVibe Brands", 
            jobTitle: "Senior Growth Marketing Manager", 
            location: "Los Angeles, CA", 
            startDate: "Jan 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Scale multi-channel paid acquisition strategy across Meta, Google Search/Performance Max, and TikTok, managing a $2.5M annual ad budget.\nDecreased overall Customer Acquisition Cost (CAC) by 28% while scaling monthly new subscriber acquisitions from 4,000 to 11,000.\nPartnered with creative design team to run 50+ monthly A/B ad creative and landing page tests in Unbounce, lifting conversion rates from 2.4% to 4.1%.\nLeveraged Google Analytics 4 (GA4) and Triple Whale for multi-touch attribution modeling and real-time ROAS reporting to the executive team." 
          },
          { 
            id: "mkt-we-2", 
            company: "NextGen Media Agency", 
            jobTitle: "Digital Marketing Specialist", 
            location: "Santa Monica, CA", 
            startDate: "Jun 2018", 
            endDate: "Dec 2021", 
            current: false, 
            bullets: "Managed Google Ads and Meta paid media accounts for 8 client accounts in e-commerce, consistently delivering a minimum 3.2x ROAS.\nCreated automated weekly reporting dashboards in Looker Studio, saving 6 hours per week in manual client reporting." 
          }
        ],
        educations: [
          { 
            id: "mkt-ed-1", 
            school: "University of California, Los Angeles (UCLA)", 
            degree: "B.A. Communication Studies (Minor in Digital Humanities)", 
            location: "Los Angeles, CA", 
            startDate: "Sep 2014", 
            endDate: "Jun 2018", 
            gpa: "3.8", 
            coursework: "Consumer Psychology, Digital Advertising, Data Analytics, Brand Management" 
          }
        ],
        projects: [
          {
            id: "mkt-proj-1",
            name: "TikTok Creator Campaign Launch",
            tech: "TikTok Ads Manager, Influencer Outreach",
            link: "",
            date: "2023",
            bullets: "Engineered a micro-influencer UGC campaign with 30 creators, generating 4.5M organic impressions and $340k in attributed revenue."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Paid Acquisition (Meta/Google/TikTok)", rating: 5 },
            { skill: "Conversion Rate Optimization (CRO)", rating: 5 },
            { skill: "Google Analytics 4 (GA4)", rating: 5 },
            { skill: "ROAS & CAC Optimization", rating: 5 },
            { skill: "A/B Landing Page Testing", rating: 4 },
            { skill: "HubSpot & Email Marketing", rating: 4 }
          ],
          descriptions: "Paid Channels: Meta Ads (Facebook/Instagram), Google Ads (Search, Shopping, PMax), TikTok Ads, Pinterest Ads\nAnalytics & Tools: GA4, Looker Studio, Triple Whale, Unbounce, Klaviyo, HubSpot, SEMrush\nCompetencies: ROAS Optimization, CAC Reduction, A/B Testing, Attribution Modeling, Funnel Optimization"
        }
      },
      critique: "An exceptional Growth Marketing Manager resume built on the Azurill two-column layout. It places revenue metrics front and center ($2.5M ad budget, 3.8x ROAS, 28% CAC reduction, 4,000 to 11,000 subscribers) to prove undeniable performance."
    },
    {
      id: "mkt-content-seo",
      persona: {
        name: "Julian Rivera",
        location: "Austin, TX",
        email: "julian.rivera@email.com",
      },
      headline: "Content Marketing & SEO Specialist",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "chikorita", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Julian Rivera", 
          email: "julian.rivera@email.com", 
          phone: "(512) 555-0133", 
          location: "Austin, TX", 
          website: "julianrivera.content", 
          linkedin: "linkedin.com/in/julianrivera-content", 
          github: "", 
          summary: "SEO and Content Marketing Specialist with 5+ years of experience building organic traffic engines for B2B SaaS companies. Increased organic search traffic by 240% in 12 months using technical SEO, keyword research, and high-intent content strategies. Skilled in Ahrefs, SEMrush, WordPress, and HubSpot."
        },
        workExperiences: [
          { 
            id: "mkt-we-3", 
            company: "SaaSify Systems", 
            jobTitle: "Content Marketing & SEO Manager", 
            location: "Austin, TX", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Grew organic monthly blog traffic from 35k to 120k visits (+240%) in 12 months by executing a comprehensive pillar-cluster content strategy.\nRanked 45+ competitive high-intent keywords on Page 1 of Google using Ahrefs and SurferSEO analysis.\nManaged a quarterly content budget of $80k, overseeing a team of 5 freelance writers and an editor.\nIntegrated lead lead-magnet CTAs into top-performing blog posts, generating 850+ monthly organic MQLs for the sales team." 
          },
          { 
            id: "mkt-we-4", 
            company: "Apex Media Group", 
            jobTitle: "Content Specialist", 
            location: "Austin, TX", 
            startDate: "Jul 2018", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Authored 150+ long-form articles, whitepapers, and case studies optimized for SEO and audience engagement.\nConducted technical SEO audits, resolving broken backlinks, 404 errors, and slow page load speeds to improve site health scores by 35%." 
          }
        ],
        educations: [
          { 
            id: "mkt-ed-2", 
            school: "University of Texas at Austin", 
            degree: "B.S. Journalism & Digital Media", 
            location: "Austin, TX", 
            startDate: "Aug 2014", 
            endDate: "May 2018", 
            gpa: "3.7", 
            coursework: "Digital Copywriting, SEO Foundations, Mass Communication, Data Journalism" 
          }
        ],
        projects: [
          {
            id: "mkt-proj-2",
            name: "B2B SaaS Content Audit & Refresh",
            tech: "Ahrefs, Clearscope, WordPress",
            link: "",
            date: "2023",
            bullets: "Audited 200 decaying legacy articles, optimizing on-page SEO and updating statistics to restore 40k lost organic visits."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "SEO (On-Page, Off-Page, Technical)", rating: 5 },
            { skill: "Ahrefs & SEMrush", rating: 5 },
            { skill: "Content Strategy & Copywriting", rating: 5 },
            { skill: "WordPress & CMS Management", rating: 4 },
            { skill: "Organic MQL Lead Generation", rating: 5 },
            { skill: "Clearscope & SurferSEO", rating: 4 }
          ],
          descriptions: "SEO Tools: Ahrefs, SEMrush, Google Search Console, Screaming Frog, SurferSEO, Clearscope\nContent Tools: WordPress, Webflow, HubSpot, Notion, Canva, Grammarly Premium\nCore Skills: Keyword Research, Content Clustering, Technical Audits, Link Building, Copywriting, MQL Conversion"
        }
      },
      critique: "A model Content & SEO Marketing resume using the Chikorita banner preset. It pairs organic traffic growth numbers (35k to 120k visits, +240%) with actual sales pipeline results (850+ monthly organic MQLs), showing SEO is driven by revenue goals."
    },
    {
      id: "mkt-social-brand",
      persona: {
        name: "Maya Patel",
        location: "New York, NY",
        email: "maya.patel@email.com",
      },
      headline: "Social Media & Brand Marketing Specialist",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "ditgar", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Maya Patel", 
          email: "maya.patel@email.com", 
          phone: "(212) 555-0182", 
          location: "New York, NY", 
          website: "", 
          linkedin: "linkedin.com/in/mayapatel-social", 
          github: "", 
          summary: "Creative Social Media and Brand Marketing Specialist with 3+ years of experience building viral organic community engagement across TikTok, Instagram, and LinkedIn. Scaled corporate brand following from 15k to 180k followers while maintaining an average engagement rate of 5.8%."
        },
        workExperiences: [
          { 
            id: "mkt-we-5", 
            company: "TrendWave Beauty", 
            jobTitle: "Social Media & Community Manager", 
            location: "New York, NY", 
            startDate: "Jun 2022", 
            endDate: "Present", 
            current: true, 
            bullets: "Grew brand social media presence across TikTok and Instagram from 15k to 180k organic followers in 18 months.\nScripted, filmed, and edited 20+ short-form video reels per month, accumulating 15M+ total organic views.\nManaged influencer seeding campaigns, sending product gifting suites to 100+ micro-creators with a 45% posting rate." 
          }
        ],
        educations: [
          { 
            id: "mkt-ed-3", 
            school: "New York University (NYU)", 
            degree: "B.S. Media, Culture, and Communication", 
            location: "New York, NY", 
            startDate: "Sep 2018", 
            endDate: "May 2022", 
            gpa: "3.6", 
            coursework: "Social Media Strategy, Brand Storytelling, Visual Culture, Public Relations" 
          }
        ],
        projects: [
          {
            id: "mkt-proj-3",
            name: "Viral TikTok Product Campaign",
            tech: "CapCut, TikTok Analytics",
            link: "",
            date: "2023",
            bullets: "Produced a viral TikTok trend video that reached 3.8M views and resulted in selling out 2,500 inventory units in 48 hours."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Social Media Strategy (TikTok/IG/LinkedIn)", rating: 5 },
            { skill: "Short-Form Video Editing (CapCut/Premiere)", rating: 5 },
            { skill: "Influencer Marketing & Seeding", rating: 4 },
            { skill: "Community Building & Engagement", rating: 5 },
            { skill: "Brand Storytelling", rating: 4 },
            { skill: "Sprout Social / Hootsuite", rating: 4 }
          ],
          descriptions: "Social Platforms: TikTok, Instagram, LinkedIn, YouTube Shorts, X/Twitter, Pinterest\nTools: CapCut, Adobe Premiere Pro, Canva, Sprout Social, Later, Buffer, Figma\nCompetencies: Viral Video Scripting, Community Moderation, UGC Management, Influencer Outreach"
        }
      },
      critique: "A vibrant Social Media resume that connects follower growth (15k to 180k) and organic views (15M+) directly to business results (selling out inventory units in 48 hours)."
    }
  ],

  writingGuide: {
    intro: "Writing a Marketing resume requires striking a balance between creative storytelling and hard numbers. Whether you work in paid growth, SEO content, or brand social media, recruiters want to see exact metrics like ROAS, CAC reduction, organic traffic growth, or MQL conversion rates.",
    tips: [
      "Always include financial or growth metrics (ROAS, CAC, MQLs, traffic %, conversion rates).",
      "List the exact tools and platforms you use (GA4, Ahrefs, Meta Ads Manager, HubSpot, Unbounce).",
      "Tailor your resume specifically to your sub-field (Paid Media vs. Content/SEO vs. Brand Social).",
      "Highlight A/B testing and experimentation experience to prove a scientific approach to growth."
    ],
    headlineExamples: [
      {
        strong: "Senior Growth Marketing Manager | Paid Media & CRO | $2.5M Budget (3.8x ROAS)",
        weak: "Marketing Specialist looking for new opportunity",
        explanation: "The strong headline establishes domain (Growth/Paid Media), budget scale, and ROAS performance instantly."
      }
    ],
    summaryExamples: [
      {
        strong: "Data-driven Growth Marketer with 6+ years of experience scaling acquisition channels for SaaS and D2C brands. Managed $2M+ in ad spend with 3.5x ROAS and reduced customer acquisition costs by 28%.",
        weak: "Creative marketer with passion for social media campaigns, brand strategy, and connecting with customers.",
        explanation: "The strong summary provides immediate concrete metrics instead of generic adjectives."
      }
    ],
    bulletGuidance: "Use the formula: Action + Channel/Tool + Growth Metric + Outcome. Example: 'Decreased overall Customer Acquisition Cost (CAC) by 28% while scaling monthly new subscriber acquisitions from 4,000 to 11,000.'",
    expertQuote: "A great marketer knows how to market themselves. If your resume lists responsibilities without conversion numbers or ROAS, I assume your campaigns didn't perform.",
    faq: [
      {
        q: "Should I include a portfolio link on a marketing resume?",
        a: "Yes! Including links to ad creative samples, published articles, landing pages, or dashboard screenshots strongly reinforces your experience."
      },
      {
        q: "Which certifications matter most for marketing?",
        a: "Google Analytics (GA4), Google Ads, HubSpot Content/Inbound, and Meta Certified Digital Marketing certifications carry significant weight."
      }
    ],
    relatedRoles: [
      { title: "Digital Marketing Manager", slug: "digital-marketing-manager" },
      { title: "SEO Specialist", slug: "seo-specialist" },
      { title: "Growth Hacker", slug: "growth-hacker" },
      { title: "Content Strategist", slug: "content-strategist" }
    ]
  }
};
