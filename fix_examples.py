import os

path = 'components/ResumeExamplesData.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_skills_1 = '''      skills: [
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
      ],'''

good_skills_1 = '''      skills: {
        featuredSkills: [
          { skill: "Advertising", rating: 5 },
          { skill: "B2B Marketing", rating: 5 },
          { skill: "Content Marketing", rating: 5 },
          { skill: "Digital Marketing", rating: 5 },
          { skill: "Lead Generation", rating: 5 },
          { skill: "Management", rating: 5 }
        ],
        descriptions: "Advertising, Analysis, B2B Marketing, B2B Relations Management, B2C Relations Management, Content Marketing, Cross-Channel Campaigns, Customer Acquisition, Customer Lifetime Value, Data Analysis, Digital Advertising, Digital Marketing, Email Marketing, Events Management, Google Analytics, Lead Conversion, Lead Generation, Management, Marketing Campaign Management"
      },'''

bad_skills_2 = '''      skills: [
        { id: "s1", skill: "Advertising" },
        { id: "s2", skill: "Analysis" },
        { id: "s3", skill: "B2B Marketing" },
        { id: "s4", skill: "Email Marketing" },
        { id: "s5", skill: "Events Management" },
        { id: "s6", skill: "New Business Development" },
        { id: "s7", skill: "Paid Digital Channels" },
      ],'''

good_skills_2 = '''      skills: {
        featuredSkills: [
          { skill: "Advertising", rating: 5 },
          { skill: "B2B Marketing", rating: 5 },
          { skill: "Email Marketing", rating: 5 },
          { skill: "Events Management", rating: 5 },
          { skill: "New Business Development", rating: 5 },
          { skill: "Paid Digital Channels", rating: 5 }
        ],
        descriptions: "Advertising, Analysis, B2B Marketing, Email Marketing, Events Management, New Business Development, Paid Digital Channels"
      },'''

bad_skills_3 = '''      skills: [
        { id: "s1", skill: "Advertising" },
        { id: "s2", skill: "Analysis" },
      ],'''

good_skills_3 = '''      skills: {
        featuredSkills: [
          { skill: "Advertising", rating: 5 },
          { skill: "Analysis", rating: 5 }
        ],
        descriptions: "Advertising, Analysis"
      },'''

content = content.replace(bad_skills_1, good_skills_1)
content = content.replace(bad_skills_2, good_skills_2)
content = content.replace(bad_skills_3, good_skills_3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
