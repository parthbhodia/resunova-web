import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const educationData: RolePageData = {
  slug: "education",
  title: "Educator / Teacher",
  category: "Education",
  pageTitle: "5 Teacher & Educator Resume Examples for 2025",
  metaDescription: "Browse professionally written Teacher & Educator resume examples. Learn how to highlight state teaching credentials, curriculum design, student test scores, and LMS tools.",
  
  marketInsights: {
    medianSalary: "$55,000 – $90,000",
    education: "Bachelor's or Master's degree in Education / Subject Field",
    yearsExperience: "1–8+ years",
    workStyle: "In-Person / Hybrid",
    careerPath: "Student Teacher → Classroom Teacher → Department Chair → Assistant Principal → School Principal",
    certifications: ["State Teaching License / Certification", "Google Certified Educator", "National Board Certification (NBCT)"],
  },

  examples: [
    {
      id: "edu-high-school-teacher",
      persona: {
        name: "Clara Montgomery",
        location: "Chicago, IL",
        email: "clara.montgomery@email.com",
      },
      headline: "High School STEM Teacher & Department Lead",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#0284c7", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Clara Montgomery", 
          email: "clara.montgomery@email.com", 
          phone: "(312) 555-0167", 
          location: "Chicago, IL", 
          website: "", 
          linkedin: "linkedin.com/in/claramontgomery-edu", 
          github: "", 
          summary: "State-certified STEM High School Teacher with 7+ years of experience developing interactive science curricula for 120+ students annually. Increased state standardized science test pass rates from 74% to 91%. Google Certified Educator proficient in Canvas LMS, Google Classroom, and differentiated instruction."
        },
        workExperiences: [
          { 
            id: "edu-we-1", 
            company: "Lincoln Park High School", 
            jobTitle: "Science Teacher & Science Dept Lead", 
            location: "Chicago, IL", 
            startDate: "Aug 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Teach Physics and Chemistry to 120+ high school students per semester, designing project-based learning curricula aligned with Next Generation Science Standards (NGSS).\nIncreased student state standardized exam pass rate from 74% to 91% over 3 academic years.\nLead a department of 8 science teachers, facilitating monthly curriculum alignment meetings and managing a $25k laboratory equipment budget.\nUtilize Canvas LMS and Google Classroom to post assignments, grade coursework, and maintain daily parent-teacher communication." 
          },
          { 
            id: "edu-we-2", 
            company: "Oak Park Middle School", 
            jobTitle: "Middle School Science Teacher", 
            location: "Oak Park, IL", 
            startDate: "Aug 2017", 
            endDate: "Jun 2020", 
            current: false, 
            bullets: "Delivered engaging earth science lessons for 90 8th-grade students using differentiated instruction to accommodate IEP and 504 plans.\nOrganized annual Regional Science Fair featuring 150 student projects." 
          }
        ],
        educations: [
          { 
            id: "edu-ed-1", 
            school: "University of Illinois Chicago", 
            degree: "M.Ed. Secondary Education (Science)", 
            location: "Chicago, IL", 
            startDate: "Aug 2015", 
            endDate: "May 2017", 
            gpa: "3.9", 
            coursework: "Curriculum Design, Adolescent Psychology, Educational Technology, Classroom Management" 
          }
        ],
        projects: [
          {
            id: "edu-proj-1",
            name: "Robotics Club & STEM Outreach",
            tech: "FIRST Robotics, Arduino",
            link: "",
            date: "2023",
            bullets: "Founded after-school Robotics club, mentoring 25 students to qualify for state-level STEM competition."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Illinois State Teaching License (6-12)", rating: 5 },
            { skill: "Curriculum Design (NGSS Standards)", rating: 5 },
            { skill: "Canvas LMS & Google Classroom", rating: 5 },
            { skill: "Differentiated Instruction (IEP/504)", rating: 5 },
            { skill: "Classroom Management", rating: 5 },
            { skill: "Google Certified Educator", rating: 4 }
          ],
          descriptions: "Certifications: Illinois Professional Educator License (PEL) - Physics/Chemistry (6-12), Google Certified Educator Level 2\nEdTech Tools: Canvas LMS, Google Classroom, PowerSchool, Kahoot, Seesaw, Zoom Education\nPedagogy: Project-Based Learning (PBL), Differentiated Instruction, IEP/504 Compliance, Formative Assessment"
        }
      },
      critique: "A standout Educator resume highlighting active state credentials (PEL), quantifiable student achievement (+17% exam pass rate), leadership (Dept Lead), and EdTech software fluency (Canvas LMS, Google Classroom)."
    },
    {
      id: "edu-instructional-designer",
      persona: {
        name: "Benjamin Hayes",
        location: "Atlanta, GA",
        email: "benjamin.hayes@email.com",
      },
      headline: "Senior Instructional Designer & E-Learning Developer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Benjamin Hayes", 
          email: "benjamin.hayes@email.com", 
          phone: "(404) 555-0182", 
          location: "Atlanta, GA", 
          website: "benjaminhayes.ed", 
          linkedin: "linkedin.com/in/benjaminhayes-id", 
          github: "", 
          summary: "Instructional Designer with 6+ years of experience designing interactive e-learning modules and corporate training programs using Articulate Storyline 360, Rise, and Adobe Captivate. Expert in ADDIE and SAM frameworks, producing SCORM-compliant courses for 10,000+ corporate learners."
        },
        workExperiences: [
          { 
            id: "edu-we-3", 
            company: "Global Learning Systems", 
            jobTitle: "Senior Instructional Designer", 
            location: "Atlanta, GA", 
            startDate: "Jan 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Design and build self-paced e-learning courses in Articulate Storyline 360 for enterprise compliance and onboarding, serving 10,000+ employees.\nApply ADDIE and SAM instructional design models to conduct needs assessments, draft storyboards, and author assessment quizzes.\nIncreased learner engagement rates by 35% by integrating interactive scenario-based simulations and gamified learning elements." 
          }
        ],
        educations: [
          { 
            id: "edu-ed-2", 
            school: "University of Georgia", 
            degree: "M.Ed. Learning, Design, and Technology", 
            location: "Athens, GA", 
            startDate: "Aug 2016", 
            endDate: "May 2018", 
            gpa: "3.92", 
            coursework: "E-Learning Authoring, Multimedia Learning Theory, Educational Research" 
          }
        ],
        projects: [
          {
            id: "edu-proj-2",
            name: "Enterprise Compliance E-Learning Suite",
            tech: "Articulate Storyline 360, SCORM 1.2",
            link: "benjaminhayes.ed/portfolio/elearning",
            date: "2023",
            bullets: "Authored 10-module SCORM 1.2 interactive course deployed across Workday Learning LMS."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Articulate Storyline 360 / Rise", rating: 5 },
            { skill: "ADDIE & SAM Frameworks", rating: 5 },
            { skill: "Adobe Captivate & Camtasia", rating: 4 },
            { skill: "SCORM / xAPI Standards", rating: 5 },
            { skill: "LMS Admin (Workday / Cornerstone)", rating: 4 },
            { skill: "Storyboard & Assessment Authoring", rating: 5 }
          ],
          descriptions: "Authoring Tools: Articulate Storyline 360, Articulate Rise, Adobe Captivate, Camtasia, Canva, Vyond\nFrameworks & Standards: ADDIE, SAM, Bloom's Taxonomy, SCORM 1.2 / 2004, xAPI, WCAG 2.1 Accessibility"
        }
      },
      critique: "A high-impact Instructional Design resume using the Onyx dark preset. Emphasizes e-learning authoring tools (Storyline 360), learner scale (10,000+ employees), and ADDIE methodology."
    },
    {
      id: "edu-elementary-teacher",
      persona: {
        name: "Jessica Miller",
        location: "Denver, CO",
        email: "jessica.miller@email.com",
      },
      headline: "Elementary School Teacher (K-5)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Jessica Miller", 
          email: "jessica.miller@email.com", 
          phone: "(303) 555-0144", 
          location: "Denver, CO", 
          website: "", 
          linkedin: "linkedin.com/in/jessicamiller-edu", 
          github: "", 
          summary: "Dedicated State-Certified Elementary School Teacher with 5+ years of experience teaching 3rd and 4th-grade classrooms. Skilled in Guided Reading, Orton-Gillingham phonics instruction, and positive classroom management. Raised class reading proficiency levels by 25%."
        },
        workExperiences: [
          { 
            id: "edu-we-4", 
            company: "Denver Public Schools", 
            jobTitle: "3rd Grade Elementary Teacher", 
            location: "Denver, CO", 
            startDate: "Aug 2019", 
            endDate: "Present", 
            current: true, 
            bullets: "Teach 26 students across core subjects (Reading, Math, Science, Social Studies), tailoring lessons for English Language Learners (ELL).\nElevated class reading proficiency by 25% on mid-year i-Ready assessments using Guided Reading groups and Orton-Gillingham strategies.\nMaintain positive parent engagement through weekly ClassDojo updates and student-led conferences." 
          }
        ],
        educations: [
          { 
            id: "edu-ed-3", 
            school: "University of Northern Colorado", 
            degree: "B.A. Elementary Education", 
            location: "Greeley, CO", 
            startDate: "Aug 2015", 
            endDate: "May 2019", 
            gpa: "3.75", 
            coursework: "Elementary Literacy, Mathematics Pedagogy, Child Development, Classroom Management" 
          }
        ],
        projects: [
          {
            id: "edu-proj-3",
            name: "Classroom Digital Reading Library",
            tech: "Epic! Reading, ClassDojo",
            link: "",
            date: "2023",
            bullets: "Curated digital library of 500+ books, increasing student independent reading time by 40 minutes per week."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Colorado Elementary Educator License", rating: 5 },
            { skill: "Guided Reading & Orton-Gillingham", rating: 5 },
            { skill: "i-Ready & Formative Assessments", rating: 4 },
            { skill: "ClassDojo & Parent Communication", rating: 5 },
            { skill: "ELL & Differentiated Learning", rating: 4 },
            { skill: "Classroom Management", rating: 5 }
          ],
          descriptions: "Licensure: Colorado Initial Elementary Educator License (K-6)\nPrograms & Tools: i-Ready, ClassDojo, Epic! Reading, Google Classroom, Seesaw, Fountas & Pinnell\nMethods: Guided Reading, Phonics (Orton-Gillingham), Differentiated Math Workstations"
        }
      },
      critique: "A warm, structured Elementary Teacher resume on the Modern preset. Highlights literacy gains (+25% reading proficiency), state license, and parent communication tools."
    }
  ],

  writingGuide: {
    intro: "A Teacher resume must showcase state teaching licenses, curriculum standards (NGSS/Common Core), student academic growth metrics, and educational technology tools.",
    tips: [
      "Put state teaching license details right in the summary and education sections.",
      "Quantify student progress (test pass rate increases, reading level gains).",
      "List LMS software tools (Google Classroom, Canvas, PowerSchool, Blackboard)."
    ],
    headlineExamples: [
      {
        strong: "State-Certified STEM High School Teacher | M.Ed. | Canvas LMS (91% Exam Pass Rate)",
        weak: "Teacher looking for classroom position",
        explanation: "Shows certification status, advanced degree, key LMS tool, and student achievement metric."
      }
    ],
    summaryExamples: [
      {
        strong: "State-certified Science Teacher with 7+ years of experience leading 120+ students per term. Increased standardized test pass rates from 74% to 91% using project-based learning.",
        weak: "Passionate educator who loves working with children and teaching science.",
        explanation: "Replaces generic statements with verified student pass rate growth metrics."
      }
    ],
    bulletGuidance: "Use: Teaching Action + Standard/Strategy + EdTech Tool + Student Outcome. Example: 'Increased student state exam pass rate from 74% to 91% through project-based learning.'",
    expertQuote: "Principals want state certification details and student growth metrics immediately.",
    faq: [
      {
        q: "Should I include student teaching experience?",
        a: "If you have less than 2 years of full-time teaching experience, yes! Detailed student teaching experience is expected for entry-level educators."
      }
    ],
    relatedRoles: [
      { title: "Academic Advisor", slug: "academic-advisor" },
      { title: "Instructional Designer", slug: "instructional-designer" },
      { title: "Assistant Principal", slug: "assistant-principal" }
    ]
  }
};
