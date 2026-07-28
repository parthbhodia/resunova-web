import os
import re

path = 'components/ResumeExamplesData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the last example and append 3 new ones.
# Actually, I can just copy the first example 3 times with the new presets.
# But it's easier to just use string manipulation.
new_examples = '''  {
    title: "Split Sidebar Resume",
    category: "Senior",
    data: {
      profile: {
        name: "Tina Miller",
        email: "tinamillernyc20@gmail.com",
        phone: "123-5456-7890",
        location: "Florida",
        linkedin: "linkedin.com/in/tina-miller-nyc",
        summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns. Increased brand awareness by 25%, website traffic by 40%, customer acquisition by 25%, customer lifetime value by 40%, and sales revenue by \ in 6 months. Led campaign strategies, resulting in a 45% increase in lead conversion.",
      },
      workExperiences: [
        {
          id: "w1",
          company: "WeWork",
          jobTitle: "Senior Marketing Manager",
          startDate: "07/2020",
          current: true,
          location: "New York, United States",
          bullets: "- Increased lead generation by 30% in 3 months through the development and execution of cross-channel campaigns targeting key customer segments.\\n- Increased the company's online presence by 25%, driving a 40% increase in website traffic and generating \ in revenue through successful digital campaigns.\\n- Led the analysis of over 75 marketing campaigns, uncovering actionable insights that led to a 25% increase in customer acquisition and a 40% growth in customer lifetime value year-over-year.",
        },
        {
          id: "w2",
          company: "NVIDIA",
          jobTitle: "Marketing Manager",
          startDate: "03/2020",
          endDate: "06/2023",
          location: "",
          bullets: "- Managed a comprehensive cross-functional marketing campaign for a new product launch, overseeing a team of 10 professionals, coordinating promotional activities, and executing digital marketing strategies across multiple channels. The campaign resulted in a 30% increase in brand awareness, generating \,000 in sales revenue within Q1.\\n- Improved long and short form YouTube strategy resulting in a 15% increase in channel views month over month through a better, SEO-targeting media strategy.",
        },
        {
          id: "w3",
          company: "White Lotus Resort",
          jobTitle: "Marketing Manager",
          startDate: "01/2017",
          endDate: "01/2020",
          location: "",
          bullets: "- Boosted digital advertising revenue by 6% within 9 months by leveraging strategic B2B and B2C relationships, enhancing client engagement.\\n- Developed a comprehensive B2B/B2C digital advertising strategy, driving a 300% revenue increase within 6 months by optimizing targeted campaigns.",
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
        { id: "s1", skill: "Advertising" },
        { id: "s2", skill: "Analysis" },
        { id: "s3", skill: "B2B Marketing" },
        { id: "s4", skill: "B2B Relations Management" },
        { id: "s5", skill: "B2C Relations Management" },
        { id: "s6", skill: "Content Marketing" },
        { id: "s7", skill: "Cross-Channel Campaigns" },
        { id: "s8", skill: "Customer Acquisition" },
        { id: "s9", skill: "Customer Lifetime Value" },
        { id: "s10", skill: "Data Analysis" },
        { id: "s11", skill: "Digital Advertising" },
        { id: "s12", skill: "Digital Marketing" },
        { id: "s13", skill: "Email Marketing" },
        { id: "s14", skill: "Events Management" },
        { id: "s15", skill: "Google Analytics" },
        { id: "s16", skill: "Lead Conversion" },
        { id: "s17", skill: "Lead Generation" },
        { id: "s18", skill: "Management" },
        { id: "s19", skill: "Marketing Campaign Management" },
      ],
      customSections: [],
      sectionOrder: ["summary", "experience", "education", "skills"],
      customization: { font: "Helvetica", accentColor: "#297860", stylePreset: "teal-line-split", pageWidth: "standard", fontSize: "medium", layout: "teal-skills-sidebar" }
    },
    isTealDemo: true,
  },
  {
    title: "Classic Left Header",
    category: "Senior",
    data: {
      profile: {
        name: "Tina Miller",
        email: "tinamillernyc20@gmail.com",
        phone: "123-5456-7890",
        location: "Florida",
        linkedin: "linkedin.com/in/tina-miller-nyc",
        summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns. Increased brand awareness by 25%, website traffic by 40%, customer acquisition by 25%, customer lifetime value by 40%, and sales revenue by \ in 6 months. Led campaign strategies, resulting in a 45% increase in lead conversion.",
      },
      workExperiences: [
        {
          id: "w1",
          company: "WeWork",
          jobTitle: "Senior Marketing Manager",
          startDate: "07/2020",
          current: true,
          location: "New York, United States",
          bullets: "- Increased lead generation by 30% in 3 months through the development and execution of cross-channel campaigns targeting key customer segments.\\n- Increased the company's online presence by 25%, driving a 40% increase in website traffic and generating \ in revenue through successful digital campaigns.\\n- Led the analysis of over 75 marketing campaigns, uncovering actionable insights that led to a 25% increase in customer acquisition and a 40% growth in customer lifetime value year-over-year.",
        },
        {
          id: "w2",
          company: "NVIDIA",
          jobTitle: "Marketing Manager",
          startDate: "03/2020",
          endDate: "06/2023",
          location: "",
          bullets: "- Managed a comprehensive cross-functional marketing campaign for a new product launch, overseeing a team of 10 professionals, coordinating promotional activities, and executing digital marketing strategies across multiple channels. The campaign resulted in a 30% increase in brand awareness, generating \,000 in sales revenue within Q1.\\n- Improved long and short form YouTube strategy resulting in a 15% increase in channel views month over month through a better, SEO-targeting media strategy.",
        }
      ],
      educations: [
        {
          id: "e1",
          school: "Georgia Institute of Technology Scheller College of Business",
          degree: "Master of Arts - MA in Marketing Management",
          location: "Atlanta, Georgia",
          startDate: "",
          endDate: "",
        },
        {
          id: "e2",
          school: "Columbia University in the City of New York",
          degree: "Bachelor of Science - BS in Communications",
          location: "New York City, New York",
          startDate: "",
          endDate: "",
        }
      ],
      projects: [],
      skills: [
        { id: "s1", skill: "Advertising" },
        { id: "s2", skill: "Analysis" },
        { id: "s3", skill: "B2B Marketing" },
        { id: "s4", skill: "Email Marketing" },
        { id: "s5", skill: "Events Management" },
        { id: "s6", skill: "New Business Development" },
        { id: "s7", skill: "Paid Digital Channels" },
      ],
      customSections: [],
      sectionOrder: ["summary", "experience", "education", "skills"],
      customization: { font: "Helvetica", accentColor: "#297860", stylePreset: "teal-line-classic", pageWidth: "standard", fontSize: "medium", layout: "teal-left-header" }
    },
    isTealDemo: true,
  },
  {
    title: "Bold Classic Header",
    category: "Senior",
    data: {
      profile: {
        name: "Tina Miller",
        email: "tinamillernyc20@gmail.com",
        phone: "123-5456-7890",
        location: "Florida",
        linkedin: "linkedin.com/in/tina-miller-nyc",
        summary: "7+ years of social marketing experience, driving customer growth and engagement in digital, B2B, and content marketing campaigns.",
      },
      workExperiences: [
        {
          id: "w1",
          company: "WeWork",
          jobTitle: "Senior Marketing Manager",
          startDate: "07/2020",
          current: true,
          location: "New York, United States",
          bullets: "- Increased lead generation by 30% in 3 months.\\n- Increased the company's online presence by 25%.",
        }
      ],
      educations: [],
      projects: [],
      skills: [
        { id: "s1", skill: "Advertising" },
        { id: "s2", skill: "Analysis" },
      ],
      customSections: [],
      sectionOrder: ["summary", "experience", "education", "skills"],
      customization: { font: "Helvetica", accentColor: "#4a3c75", stylePreset: "teal-line-bold", pageWidth: "standard", fontSize: "medium", layout: "teal-left-header" }
    },
    isTealDemo: true,
  },
'''

if 'Split Sidebar Resume' not in content:
    idx = content.find('];')
    content = content[:idx] + new_examples + content[idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

