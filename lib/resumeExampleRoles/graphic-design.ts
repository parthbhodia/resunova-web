import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const graphicDesignData: RolePageData = {
  slug: "graphic-design",
  title: "Graphic Designer",
  category: "Graphic Design",
  pageTitle: "5 Graphic Designer & UI/Visual Designer Resume Examples for 2025",
  metaDescription: "Browse professionally written Graphic Designer resume examples. Learn how to highlight Figma, Adobe Creative Cloud, brand design, UI design, and portfolio links.",
  
  marketInsights: {
    medianSalary: "$60,000 – $105,000",
    education: "Bachelor's degree in Graphic Design, Fine Arts, or Visual Communication",
    yearsExperience: "2–7+ years",
    workStyle: "Remote / Hybrid",
    careerPath: "Junior Designer → Graphic Designer → Senior Designer → Art Director → Creative Director",
    certifications: ["Adobe Certified Professional (Photoshop/Illustrator/InDesign)", "UX Design Certificate"],
  },

  examples: [
    {
      id: "gd-sr-visual",
      persona: {
        name: "Liam Sterling",
        location: "Brooklyn, NY",
        email: "liam.sterling@email.com",
      },
      headline: "Senior Graphic & Brand Designer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#ec4899", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Liam Sterling", 
          email: "liam.sterling@email.com", 
          phone: "(718) 555-0192", 
          location: "Brooklyn, NY", 
          website: "liamsterling.design", 
          linkedin: "linkedin.com/in/liamsterling-design", 
          github: "", 
          summary: "Senior Graphic Designer with 6+ years of experience crafting brand identities, marketing design assets, and UI components for digital products. Expert in Adobe Creative Cloud (Photoshop, Illustrator, InDesign), Figma, and Motion Graphics (After Effects). Spearheaded brand redesign that increased web conversion by 32%."
        },
        workExperiences: [
          { 
            id: "gd-we-1", 
            company: "Prism Creative Agency", 
            jobTitle: "Senior Brand & Visual Designer", 
            location: "New York, NY", 
            startDate: "Mar 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Lead visual brand design for 15+ client accounts in tech and e-commerce, creating brand guidelines, logos, packaging, and digital ad sets.\nSpearheaded full brand identity overhaul for a Fintech client, resulting in a 32% increase in homepage conversion rates.\nCollaborate with marketing teams to design 200+ high-performing social ad creative variants monthly, boosting CTR by 24%.\nMentor 3 junior designers and manage creative asset libraries in Figma and Adobe CC." 
          },
          { 
            id: "gd-we-2", 
            company: "Vanguard Studio", 
            jobTitle: "Graphic Designer", 
            location: "New York, NY", 
            startDate: "Jul 2018", 
            endDate: "Feb 2021", 
            current: false, 
            bullets: "Designed print collateral, digital banners, email templates, and event signage for national retail clients.\nProduced 2D motion graphics and promotional video assets using Adobe After Effects and Premiere Pro." 
          }
        ],
        educations: [
          { 
            id: "gd-ed-1", 
            school: "Pratt Institute", 
            degree: "B.F.A. Communications Design (Graphic Design)", 
            location: "Brooklyn, NY", 
            startDate: "Sep 2014", 
            endDate: "May 2018", 
            gpa: "3.8", 
            coursework: "Typography, Brand Identity Systems, Packaging Design, Motion Graphics, Interactive Media" 
          }
        ],
        projects: [
          {
            id: "gd-proj-1",
            name: "Global E-Commerce Brand Redesign",
            tech: "Figma, Illustrator, After Effects",
            link: "liamsterling.design/work/brand-redesign",
            date: "2023",
            bullets: "Created comprehensive 60-page design system and brand book used across web, print, and digital packaging."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Adobe Creative Cloud (Ps/Ai/Id)", rating: 5 },
            { skill: "Figma & UI Visual Design", rating: 5 },
            { skill: "Brand Identity & Systems", rating: 5 },
            { skill: "Motion Graphics (After Effects)", rating: 4 },
            { skill: "Typography & Layout Design", rating: 5 },
            { skill: "Print & Packaging Design", rating: 4 }
          ],
          descriptions: "Design Software: Adobe Photoshop, Illustrator, InDesign, After Effects, Premiere Pro, Figma, Canva, Webflow\nCore Specialties: Brand Identity, Visual Design, Typography, Motion Design, Packaging, Social Media Creative, Print Production"
        }
      },
      critique: "An outstanding Graphic Design resume that puts portfolio links front-and-center while demonstrating tangible business outcomes (32% conversion lift, 24% CTR increase)."
    },
    {
      id: "gd-ui-product-designer",
      persona: {
        name: "Chloe Vance",
        location: "San Francisco, CA",
        email: "chloe.vance@email.com",
      },
      headline: "UI / Product Designer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Chloe Vance", 
          email: "chloe.vance@email.com", 
          phone: "(415) 555-0188", 
          location: "San Francisco, CA", 
          website: "chloevance.ui", 
          linkedin: "linkedin.com/in/chloevance-ui", 
          github: "", 
          summary: "UI / Product Designer with 5+ years of experience designing intuitive web and mobile app interfaces in Figma. Specialist in component design systems, wireframing, interactive prototyping, and usability testing. Designed SaaS web app used by 500k+ monthly active users."
        },
        workExperiences: [
          { 
            id: "gd-we-3", 
            company: "AppSphere SaaS", 
            jobTitle: "Senior UI Designer", 
            location: "San Francisco, CA", 
            startDate: "Feb 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Architected a unified Figma design system containing 250+ accessible UI components, cutting frontend UI dev handoff time by 40%.\nRedesigned core mobile onboarding flow, driving a 22% increase in user account completion rates.\nCollaborated daily with frontend React engineers to ensure pixel-perfect CSS implementation and WCAG AA accessibility compliance." 
          }
        ],
        educations: [
          { 
            id: "gd-ed-2", 
            school: "California College of the Arts", 
            degree: "B.F.A. Interaction Design", 
            location: "San Francisco, CA", 
            startDate: "Sep 2015", 
            endDate: "May 2019", 
            gpa: "3.85", 
            coursework: "User Interface Design, Prototyping, Usability Testing, Web Accessibility" 
          }
        ],
        projects: [
          {
            id: "gd-proj-2",
            name: "Fintech Mobile App Redesign",
            tech: "Figma, Principle, Storybook",
            link: "chloevance.ui/fintech-app",
            date: "2023",
            bullets: "Created high-fidelity interactive prototype tested with 30 users, scoring 92/100 System Usability Scale (SUS)."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Figma & Design Systems", rating: 5 },
            { skill: "UI Component Architecture", rating: 5 },
            { skill: "Prototyping (Principle/Framer)", rating: 4 },
            { skill: "WCAG Accessibility (AA)", rating: 5 },
            { skill: "User Research & Usability Testing", rating: 4 },
            { skill: "HTML/CSS Basic Knowledge", rating: 4 }
          ],
          descriptions: "Tools: Figma, Framer, Principle, Storybook, Zeplin, Adobe XD, Webflow\nMethodologies: UI Design Systems, Wireframing, High-Fidelity Prototyping, Usability Testing (SUS), WCAG 2.1 AA Compliance"
        }
      },
      critique: "A sleek UI/Product Designer resume on the Onyx preset. Emphasizes Figma design systems (250+ components), onboarding conversion lifts (+22%), and WCAG accessibility."
    },
    {
      id: "gd-art-director",
      persona: {
        name: "Marcus Dupont",
        location: "Los Angeles, CA",
        email: "marcus.dupont@email.com",
      },
      headline: "Art Director & Creative Lead",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#d97706", stylePreset: "bronzor", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Marcus Dupont", 
          email: "marcus.dupont@email.com", 
          phone: "(310) 555-0144", 
          location: "Los Angeles, CA", 
          website: "marcusdupont.art", 
          linkedin: "linkedin.com/in/marcusdupont-art", 
          github: "", 
          summary: "Art Director with 8+ years of experience steering creative vision for global fashion, lifestyle, and consumer brands. Expert in photoshoot direction, video production, campaign concepts, and leading teams of graphic designers, animators, and copywriters."
        },
        workExperiences: [
          { 
            id: "gd-we-4", 
            company: "Elevation Creative Agency", 
            jobTitle: "Art Director", 
            location: "Los Angeles, CA", 
            startDate: "Jan 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Direct creative vision for 360-degree omnichannel marketing campaigns for top-tier beauty and apparel clients, managing $1.5M creative budgets.\nLead a creative squad of 8 designers, copywriters, and motion animators, achieving 98% client approval rate on initial concept presentations.\nSpearheaded national billboard and digital campaign that won a 2023 Clio Award for Visual Concept." 
          }
        ],
        educations: [
          { 
            id: "gd-ed-3", 
            school: "Otis College of Art and Design", 
            degree: "B.F.A. Visual Communication", 
            location: "Los Angeles, CA", 
            startDate: "Sep 2011", 
            endDate: "May 2015", 
            gpa: "3.75", 
            coursework: "Art Direction, Photography, Commercial Video Production, Brand Architecture" 
          }
        ],
        projects: [
          {
            id: "gd-proj-3",
            name: "Spring Fashion Commercial Campaign",
            tech: "Photoshoot Direction, Adobe CC",
            link: "marcusdupont.art/spring-campaign",
            date: "2023",
            bullets: "Directed 3-day multi-location photo/video shoot resulting in national TV spot and social ad suite."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Art Direction & Creative Vision", rating: 5 },
            { skill: "Photoshoot & Video Direction", rating: 5 },
            { skill: "Creative Team Leadership (8+)", rating: 5 },
            { skill: "360-Degree Campaign Concepting", rating: 5 },
            { skill: "Adobe Creative Cloud", rating: 5 },
            { skill: "Client Pitching & Presentations", rating: 5 }
          ],
          descriptions: "Core Skills: Art Direction, Creative Strategy, Photoshoot Directing, Video Production, Brand Identity, Pitch Decks, Executive Presentation"
        }
      },
      critique: "An elegant Art Director resume using the Bronzor preset. Showcases high-level creative leadership ($1.5M budget, team of 8), photoshoot direction, and prestigious industry awards."
    }
  ],

  writingGuide: {
    intro: "A Graphic Designer resume must pair a prominent portfolio link with tangible evidence of design impact (conversion rates, engagement lifts, asset volume). List Adobe CC and Figma software mastery clearly.",
    tips: [
      "Include a clickable link to your Online Portfolio / Behance / Dribbble in the header.",
      "Quantify design output and business results (e.g., '200+ monthly ad variants resulting in a 24% CTR increase').",
      "List design tools explicitly (Figma, Photoshop, Illustrator, InDesign, After Effects)."
    ],
    headlineExamples: [
      {
        strong: "Senior Graphic & Brand Designer | Adobe CC & Figma | 32% Conversion Lift",
        weak: "Graphic designer looking for creative projects",
        explanation: "Highlights seniority, primary tools, and metric-driven design impact."
      }
    ],
    summaryExamples: [
      {
        strong: "Senior Graphic Designer with 6+ years of experience crafting brand identities, marketing assets, and UI components in Adobe CC and Figma. Led brand redesign that boosted web conversion by 32%.",
        weak: "Passionate creative designer who loves typography, colors, and visual art.",
        explanation: "Replaces artistic preferences with professional tool mastery and conversion impact."
      }
    ],
    bulletGuidance: "Use: Design Action + Asset Type/Tool + Business Outcome. Example: 'Designed social ad creative variants in Figma, boosting CTR by 24%.'",
    expertQuote: "A designer's resume gets skimmed in 5 seconds. If the portfolio link isn't immediately visible, you're missing out.",
    faq: [
      {
        q: "Do I need a custom website or is PDF portfolio okay?",
        a: "A clean custom website or Behance/Dribbble link is strongly preferred over attached PDFs."
      }
    ],
    relatedRoles: [
      { title: "UI/UX Designer", slug: "ui-ux-designer" },
      { title: "Art Director", slug: "art-director" },
      { title: "Visual Designer", slug: "visual-designer" }
    ]
  }
};
