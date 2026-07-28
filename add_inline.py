import re

with open('components/ResumeExamplesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Just find the index of "Modern Bookmark Resume" block and insert it after
idx = content.find('"Modern Bookmark Resume",')
if idx == -1:
    print("Could not find Bookmark")
    exit(1)

# Find the end of the Bookmark object
end_idx = content.find('  },', idx) + 4

block = """
  {
    category: "Teal Demo",
    title: "Inline Minimalist Resume",
    description: "Teal HQ Inline Minimalist layout with blue accents and compact styling.",
    roleHref: "/resume-examples/demo",
    data: {
      profile: {
        name: "Tina Miller",
        email: "tinamillernyc20@gmail.com",
        phone: "123-5456-7890",
        location: "Florida",
        linkedin: "linkedin.com/in/tina-miller-nyc",
        github: "",
        website: "",
        summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns. Increased brand awareness by 25%, website traffic by 40%, customer acquisition by 25%, customer lifetime value by 40%, and sales revenue by  in 6 months. Led campaign strategies, resulting in a 45% increase in lead conversion.",
      },
      workExperiences: [
        { id: "tm-we-1", company: "WeWork", jobTitle: "Senior Marketing Manager", location: "New York, United States", startDate: "07/2020", endDate: "Present", current: true, bullets: "Increased lead generation by 30% in 3 months through the development and execution of cross-channel campaigns targeting key customer segments.\\nIncreased the company's online presence by 25%, driving a 40% increase in website traffic and generating  in revenue through successful digital campaigns.\\nLed the analysis of over 75 marketing campaigns, uncovering actionable insights that led to a 25% increase in customer acquisition and a 40% growth in customer lifetime value year-over-year." },
        { id: "tm-we-2", company: "NVIDIA", jobTitle: "Marketing Manager", location: "United States", startDate: "03/2020", endDate: "06/2023", current: false, bullets: "Managed a comprehensive cross-functional marketing campaign for a new product launch, overseeing a team of 10 professionals, coordinating promotional activities, and executing digital marketing strategies across multiple channels. The campaign resulted in a 30% increase in brand awareness, generating ,000 in sales revenue within Q1.\\nImproved long and short form YouTube strategy resulting in a 15% increase in channel views month over month through a better, SEO-targeting media strategy." },
        { id: "tm-we-3", company: "White Lotus Resort", jobTitle: "Marketing Manager", location: "United States", startDate: "01/2017", endDate: "01/2020", current: false, bullets: "Boosted digital advertising revenue by 6% within 9 months by leveraging strategic B2B and B2C relationships, enhancing client engagement.\\nDeveloped a comprehensive B2B/B2C digital advertising strategy, driving a 300% revenue increase within 6 months by optimizing targeted campaigns.\\nCreated a comprehensive digital marketing strategy that significantly improved online visibility, resulting in a measurable increase in customer engagement." }
      ],
      educations: [
        { id: "tm-ed-1", school: "Georgia Institute of Technology Scheller College of Business", degree: "Master of Arts - MA in Marketing Management in Marketing Management", location: "Atlanta, Georgia", startDate: "", endDate: "", current: false },
        { id: "tm-ed-2", school: "Columbia University in the City of New York", degree: "Bachelor of Science - BS in Communications in Communications", location: "New York City, New York", startDate: "", endDate: "", current: false }
      ],
      projects: [],
      skills: [
        { id: "tm-sk-1", name: "Advertising, Analysis, B2B Marketing, B2B Relations Management, B2C Relations Management, Content Marketing, Cross-Channel Campaigns, Customer Acquisition, Customer Lifetime Value, Data Analysis, Digital Advertising, Digital Marketing, Email Marketing, Events Management, Google Analytics, Lead Conversion, Lead Generation, Management, Marketing Campaign Management, Marketing Technology, Martech Tools, Media Campaigns, Media Strategy" }
      ],
      customSections: []
    },
    style: {
      preset: "teal-inline",
      pageWidth: "standard",
      font: "Helvetica",
      fontSize: "medium",
      accentColor: "#2563eb",
      lineHeight: 1.4,
    }
  },
"""

new_content = content[:end_idx] + block + content[end_idx:]

with open('components/ResumeExamplesData.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Added Inline Minimalist to ResumeExamplesData")
