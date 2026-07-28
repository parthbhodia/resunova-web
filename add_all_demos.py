with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# We know the original file starts with 'export const RESUME_EXAMPLES_DATA = [\n'
idx = content.find('export const RESUME_EXAMPLES_DATA = [\n') + 38

tina_miller_data = """
const tinaMillerData = {
  profile: {
    name: "Tina Miller",
    email: "tinamillernyc20@gmail.com",
    phone: "123-5456-7890",
    location: "Florida",
    linkedin: "linkedin.com/in/tina-miller-nyc",
    summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns. Increased brand awareness by 25%, website traffic by 40%, customer acquisition by 25%, customer lifetime value by 40%, and sales revenue by  in 6 months. Led campaign strategies, resulting in a 45% increase in lead conversion.",
  },
  workExperiences: [
    {
      id: "w1",
      company: "WeWork",
      jobTitle: "Senior Marketing Manager",
      startDate: "07/2020",
      current: true,
      location: "New York, United States",
      bullets: "- Increased lead generation by 30% in 3 months through the development and execution of cross-channel campaigns targeting key customer segments.\\n- Increased the company's online presence by 25%, driving a 40% increase in website traffic and generating  in revenue through successful digital campaigns.\\n- Led the analysis of over 75 marketing campaigns, uncovering actionable insights that led to a 25% increase in customer acquisition and a 40% growth in customer lifetime value year-over-year.",
    },
    {
      id: "w2",
      company: "NVIDIA",
      jobTitle: "Marketing Manager",
      startDate: "03/2020",
      endDate: "06/2023",
      location: "United States",
      bullets: "- Managed a comprehensive cross-functional marketing campaign for a new product launch, overseeing a team of 10 professionals, coordinating promotional activities, and executing digital marketing strategies across multiple channels. The campaign resulted in a 30% increase in brand awareness, generating ,000 in sales revenue within Q1.\\n- Improved long and short form YouTube strategy resulting in a 15% increase in channel views month over month through a better, SEO-targeting media strategy.",
    },
    {
      id: "w3",
      company: "White Lotus Resort",
      jobTitle: "Marketing Manager",
      startDate: "01/2017",
      endDate: "01/2020",
      location: "United States",
      bullets: "- Boosted digital advertising revenue by 6% within 9 months by leveraging strategic B2B and B2C relationships, enhancing client engagement.\\n- Developed a comprehensive B2B/B2C digital advertising strategy, driving a 300% revenue increase within 6 months by optimizing targeted campaigns.\\n- Created a comprehensive digital marketing strategy that significantly improved online visibility, resulting in a measurable increase in customer engagement.",
    }
  ],
  educations: [
    {
      id: "e1",
      school: "Georgia Institute of Technology Scheller College of Business",
      degree: "Master of Arts - MA in Marketing Management in Marketing Management",
      location: "Atlanta, Georgia",
      startDate: "",
      endDate: "",
    },
    {
      id: "e2",
      school: "Columbia University in the City of New York",
      degree: "Bachelor of Science - BS in Communications in Communications",
      location: "New York City, New York",
      startDate: "",
      endDate: "",
    }
  ],
  projects: [],
  skills: [
    { id: "s1", name: "Advertising, Analysis, B2B Marketing, B2B Relations Management, B2C Relations Management, Content Marketing, Cross-Channel Campaigns, Customer Acquisition, Customer Lifetime Value, Data Analysis, Digital Advertising, Digital Marketing, Email Marketing, Events Management, Google Analytics, Lead Conversion, Lead Generation, Management, Marketing Campaign Management, Marketing Technology, Martech Tools, Media Campaigns, Media Strategy" }
  ],
  customSections: [],
  sectionOrder: ["summary", "experience", "education", "skills"],
};
"""

# Now we need to inject the 6 templates!
demos = """
  {
    category: "Teal Demo",
    title: "Clean Balanced Resume Template",
    description: "Teal HQ Clean Balanced layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#000000", stylePreset: "teal-clean", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
  {
    category: "Teal Demo",
    title: "Modern Bookmark Resume",
    description: "Teal HQ Bookmark layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#eab308", stylePreset: "teal-bookmark", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
  {
    category: "Teal Demo",
    title: "Sleek Professional Resume",
    description: "Teal HQ Sleek Professional layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "teal-sleek", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
  {
    category: "Teal Demo",
    title: "Modern Color Accent Resume",
    description: "Teal HQ Modern Color layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "teal-modern", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
  {
    category: "Teal Demo",
    title: "Professional and Clear Resume",
    description: "Teal HQ Professional Clear layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "teal-clear", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
  {
    category: "Teal Demo",
    title: "Inline Minimalist Resume",
    description: "Teal HQ Inline Minimalist layout.",
    roleHref: "/resume-examples/demo",
    data: { ...tinaMillerData, customization: { font: "Helvetica", accentColor: "#2563eb", stylePreset: "teal-inline", pageWidth: "standard", fontSize: "medium", layout: "single" } },
    isTealDemo: true,
  },
"""

content = content.replace('export const RESUME_EXAMPLES_DATA = [', tina_miller_data + '\nexport const RESUME_EXAMPLES_DATA = [\n' + demos)

with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected all 6 demos")
