import { TBResumeData, DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

const tinaMillerData = {
  sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
  hiddenSections: [],
  customSections: [],
  profile: {
    name: "Tina Miller", 
    email: "tinamiller.nyc20@gmail.com", 
    phone: "123-5456-7890", 
    location: "Florida", 
    website: "", 
    linkedin: "linkedin.com/in/tina-miller-nyc", 
    github: "", 
    summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns. Increased brand awareness by 25%, website traffic by 40%, customer acquisition by 25%, customer lifetime value by 40%, and sales revenue by $2M in 6 months. Led campaign strategies, resulting in a 45% increase in lead conversion."
  },
  workExperiences: [
    { id: "tm-we-1", company: "WeWork", jobTitle: "Senior Marketing Manager", location: "New York, United States", startDate: "07/2020", endDate: "Present", current: true, bullets: "Increased lead generation by 30% in 3 months through the development and execution of cross-channel campaigns targeting key customer segments.\nIncreased the company's online presence by 25%, driving a 40% increase in website traffic and generating $2M in revenue through successful digital campaigns.\nLed the analysis of over 75 marketing campaigns, uncovering actionable insights that led to a 25% increase in customer acquisition and a 40% growth in customer lifetime value year-over-year." },
    { id: "tm-we-2", company: "NVIDIA", jobTitle: "Marketing Manager", location: "United States", startDate: "03/2020", endDate: "06/2022", current: false, bullets: "Managed a comprehensive cross-functional marketing campaign for a new product launch, overseeing a team of 10 professionals, coordinating promotional activities, and executing digital marketing strategies across multiple channels. The campaign resulted in a 30% increase in brand awareness, generating $500,000 in sales revenue within Q1.\nImproved long and short form YouTube strategy resulting in a 15% increase in channel views month over month through a better SEO-targeting media strategy." },
    { id: "tm-we-3", company: "White Lotus Resort", jobTitle: "Marketing Manager", location: "United States", startDate: "01/2017", endDate: "01/2020", current: false, bullets: "Boosted digital advertising revenue by 6% within 9 months by leveraging strategic B2B and B2C relationships, enhancing client engagement.\nDeveloped a comprehensive B2B/B2C digital advertising strategy, driving a 300% revenue increase within 6 months by optimizing targeted campaigns.\nCreated a comprehensive digital marketing strategy that significantly improved online visibility, resulting in a measurable increase in customer engagement." }
  ],
  educations: [
    { id: "tm-ed-1", school: "Georgia Institute of Technology Scheller College of Business", degree: "Master of Arts in Marketing Management", location: "Atlanta, Georgia", startDate: "", endDate: "", gpa: "", coursework: "" }
  ],
  projects: [],
  skills: {
    featuredSkills: [
      { skill: "Cross-Channel Campaigns", rating: 5 },
      { skill: "Customer Acquisition", rating: 5 },
      { skill: "Digital Advertising", rating: 5 },
      { skill: "Data Analysis", rating: 4 },
      { skill: "SEO Strategy", rating: 4 },
      { skill: "B2B Marketing", rating: 4 }
    ],
    descriptions: "Skills: Advertising, Analysis, B2B Marketing, B2B Relations Management, Content Marketing, Cross-Channel Campaigns, Customer Acquisition, Customer Lifetime Value, Data Analysis, Digital Advertising, Digital Marketing, Email Marketing, Events Management, Google Analytics, Lead Conversion, Lead Generation, Management, Marketing Campaign Management, Marketing Technology, Martech Tools, Media Campaigns, Media Strategy, New Business Development, Paid Digital Channels, Partner Management, PPC, Problem Solving, Product Marketing, Project Management, Revenue Management, Sales Revenue Growth, SEO Strategy, Social Marketing, Web Traffic Growth"
  }
};

export const RESUME_EXAMPLES_DATA = [
  {
    title: "Clean Balanced Resume Template",
    category: "Marketing",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "The Clean Balanced Template is all about clarity and simplicity. With its balanced use of space and monochromatic color scheme, this design accentuates your professional story without distractions.",
    score: 98,
    tags: ["Digital Marketing", "Cross-Channel", "B2B"],
    data: {
      ...tinaMillerData,
      skills: {
        ...tinaMillerData.skills,
        descriptions: "• Advertising\n• Analysis\n• B2B Marketing\n• Content Marketing\n• Cross-Channel Campaigns\n• Customer Acquisition\n• Customer Lifetime Value\n• Data Analysis\n• Digital Advertising\n• Digital Marketing\n• Email Marketing\n• Events Management\n• Google Analytics\n• Lead Conversion\n• Lead Generation\n• Management\n• Marketing Campaign Management\n• Marketing Technology\n• Martech Tools\n• Media Campaigns\n• Media Strategy\n• New Business Development\n• Paid Digital Channels\n• Partner Management\n• PPC\n• Problem Solving\n• Product Marketing\n• Project Management\n• Revenue Management\n• Sales Revenue Growth\n• SEO Strategy\n• Social Marketing\n• Web Traffic Growth"
      },
      customization: { font: "Helvetica", accentColor: "#000000", stylePreset: "teal-clean", pageWidth: "standard", fontSize: "medium", layout: "teal-split" }
    } as unknown as TBResumeData,
  },
  {
    title: "Sleek Professional Resume",
    category: "Marketing",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "This design showcases a clean, professional layout with strategic use of color accents that draw attention to key areas. The minimalist typography ensures readability.",
    score: 98,
    tags: ["Digital Marketing", "Cross-Channel", "B2B"],
    data: {
      ...tinaMillerData,
      customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "teal-sleek", pageWidth: "standard", fontSize: "medium", layout: "teal-single" }
    } as unknown as TBResumeData,
  },
  {
    title: "Modern Color Accent Resume",
    category: "Marketing",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "This elegant resume template combines modern typography with a clean, structured layout to make a strong professional impact.",
    score: 98,
    tags: ["Digital Marketing", "Cross-Channel", "B2B"],
    data: {
      ...tinaMillerData,
      customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "teal-modern", pageWidth: "standard", fontSize: "medium", layout: "teal-centered" }
    } as unknown as TBResumeData,
  },
  {
    title: "Professional and Clear Resume",
    category: "Marketing",
    level: "Senior",
    levelColor: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "This resume template captures a professional yet straightforward aesthetic, offering a clean layout with essential information prominent.",
    score: 98,
    tags: ["Digital Marketing", "Cross-Channel", "B2B"],
    data: {
      ...tinaMillerData,
      skills: {
        ...tinaMillerData.skills,
        descriptions: "• Advertising\n• Analysis\n• B2B Marketing\n• Content Marketing\n• Cross-Channel Campaigns\n• Customer Acquisition\n• Customer Lifetime Value\n• Data Analysis\n• Digital Advertising\n• Digital Marketing\n• Email Marketing\n• Events Management\n• Google Analytics\n• Lead Conversion\n• Lead Generation\n• Management\n• Marketing Campaign Management\n• Marketing Technology\n• Martech Tools\n• Media Campaigns\n• Media Strategy\n• New Business Development\n• Paid Digital Channels\n• Partner Management\n• PPC\n• Problem Solving\n• Product Marketing\n• Project Management\n• Revenue Management\n• Sales Revenue Growth\n• SEO Strategy\n• Social Marketing\n• Web Traffic Growth"
      },
      customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "teal-clear", pageWidth: "standard", fontSize: "medium", layout: "teal-split" }
    } as unknown as TBResumeData,
  }
];
