import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const healthcareData: RolePageData = {
  slug: "healthcare",
  title: "Healthcare Professional",
  category: "Healthcare",
  pageTitle: "5 Healthcare & Registered Nurse (RN) Resume Examples for 2025",
  metaDescription: "Browse professionally written Healthcare resume examples. Learn how to highlight clinical patient care, BSN/RN credentials, EMR systems (Epic/Cerner), and compliance.",
  
  marketInsights: {
    medianSalary: "$78,000 – $120,000",
    education: "Associate (ADN) or Bachelor of Science in Nursing (BSN)",
    yearsExperience: "1–8+ years",
    workStyle: "In-Person / Clinical",
    careerPath: "Staff Nurse (RN) → Charge Nurse → Nurse Manager → Clinical Nurse Specialist → Director of Nursing",
    certifications: ["Registered Nurse (RN)", "BLS / ACLS (AHA)", "CCRN (Critical Care)", "PALS"],
  },

  examples: [
    {
      id: "hc-rn-charge",
      persona: {
        name: "Sarah Jenkins, BSN, RN",
        location: "Houston, TX",
        email: "sarah.jenkins.rn@email.com",
      },
      headline: "Registered Nurse (RN) & Charge Nurse",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#dc2626", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Sarah Jenkins, BSN, RN", 
          email: "sarah.jenkins.rn@email.com", 
          phone: "(713) 555-0188", 
          location: "Houston, TX", 
          website: "", 
          linkedin: "linkedin.com/in/sarahjenkins-rn", 
          github: "", 
          summary: "Dedicated BSN-prepared Registered Nurse and Charge Nurse with 6+ years of clinical experience in high-volume Acute Care and Medical-Surgical units. Proven ability to manage 5–6 complex patients simultaneously while maintaining a 98% patient satisfaction rating. Certified in BLS, ACLS, and Epic EMR charting."
        },
        workExperiences: [
          { 
            id: "hc-we-1", 
            company: "Houston Methodist Hospital", 
            jobTitle: "Charge Nurse / Med-Surg RN", 
            location: "Houston, TX", 
            startDate: "Jan 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Supervise daily clinical operations and patient assignments for a 32-bed Med-Surg unit, leading a shift team of 10 RNs and 4 PCAs.\nAdminister medications, IV therapies, and wound care while maintaining strict adherence to HIPAA and Joint Commission standards.\nUtilize Epic EMR system for comprehensive patient charting, medication administration verification (BCMA), and interdisciplinary care coordination.\nReduced unit-acquired catheter-associated urinary tract infections (CAUTI) by 40% through staff training on evidence-based hygiene protocols." 
          },
          { 
            id: "hc-we-2", 
            company: "St. Luke's Health Center", 
            jobTitle: "Staff Registered Nurse (RN)", 
            location: "Houston, TX", 
            startDate: "Jun 2018", 
            endDate: "Dec 2020", 
            current: false, 
            bullets: "Delivered direct patient care for 5-6 acute care patients per shift, monitoring vital signs, administering IV medications, and educating families.\nReceived Hospital Nurse of the Month award twice based on patient feedback and peer recognition." 
          }
        ],
        educations: [
          { 
            id: "hc-ed-1", 
            school: "University of Texas Health Science Center", 
            degree: "Bachelor of Science in Nursing (BSN)", 
            location: "Houston, TX", 
            startDate: "Aug 2014", 
            endDate: "May 2018", 
            gpa: "3.8", 
            coursework: "Pharmacology, Health Assessment, Medical-Surgical Nursing, Pathophysiology, Nursing Leadership" 
          }
        ],
        projects: [
          {
            id: "hc-proj-1",
            name: "Unit Infection Control Initiative",
            tech: "Epic EMR, Joint Commission Guidelines",
            link: "",
            date: "2023",
            bullets: "Implemented new central line dressing change checklist, reducing CLABSI rate to zero for 14 consecutive months."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "BSN / Registered Nurse (RN) License", rating: 5 },
            { skill: "Epic EMR & Cerner Charting", rating: 5 },
            { skill: "Acute Care & Med-Surg Clinical Care", rating: 5 },
            { skill: "BLS & ACLS Certified (AHA)", rating: 5 },
            { skill: "HIPAA & Joint Commission Compliance", rating: 5 },
            { skill: "Patient Education & Care Coordination", rating: 4 }
          ],
          descriptions: "Licenses & Certifications: Registered Nurse (RN) - Texas Board of Nursing, BLS, ACLS, PALS\nSystems: Epic Systems, Cerner, Pyxis Automated Medication Dispensers\nClinical Skills: IV Insertion, Medication Administration (BCMA), Wound Care, Telemetry Monitoring, Infection Control"
        }
      },
      critique: "A top-tier Nursing resume highlighting active licenses (BSN, RN), certifications (BLS, ACLS), bed/unit scale (32 beds, 10 RNs), EMR systems (Epic), and clinical outcome improvements (40% infection reduction)."
    },
    {
      id: "hc-nurse-practitioner",
      persona: {
        name: "Dr. Amanda Ross, MSN, APRN, FNP-C",
        location: "Dallas, TX",
        email: "amanda.ross.fnp@email.com",
      },
      headline: "Family Nurse Practitioner (FNP-C)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#0284c7", stylePreset: "onyx", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Dr. Amanda Ross, MSN, APRN, FNP-C", 
          email: "amanda.ross.fnp@email.com", 
          phone: "(214) 555-0199", 
          location: "Dallas, TX", 
          website: "", 
          linkedin: "linkedin.com/in/amandaross-fnp", 
          github: "", 
          summary: "Board-certified Family Nurse Practitioner with 8+ years of combined clinical healthcare experience. Proficient in autonomous primary care delivery, chronic disease management, ordering and interpreting diagnostic tests, and prescribing pharmacological therapies for 20+ patients daily."
        },
        workExperiences: [
          { 
            id: "hc-we-3", 
            company: "Dallas Family Health Clinic", 
            jobTitle: "Family Nurse Practitioner (FNP)", 
            location: "Dallas, TX", 
            startDate: "Jan 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Provide autonomous primary care for diverse patient population (ages 2+), conducting 22+ comprehensive wellness exams and acute visits daily.\nDiagnose acute/chronic illnesses, order labs/radiology, and formulate evidence-based treatment plans including prescriptive authority.\nManage diabetes and hypertension management clinic, achieving 82% target HbA1c control rate across high-risk patient panel." 
          }
        ],
        educations: [
          { 
            id: "hc-ed-2", 
            school: "Baylor University", 
            degree: "Master of Science in Nursing - Family Nurse Practitioner (MSN-FNP)", 
            location: "Dallas, TX", 
            startDate: "Aug 2018", 
            endDate: "Dec 2020", 
            gpa: "3.95", 
            coursework: "Advanced Pharmacology, Advanced Pathophysiology, Advanced Health Assessment" 
          }
        ],
        projects: [
          {
            id: "hc-proj-2",
            name: "Telehealth Primary Care Expansion",
            tech: "Cerner Ambulatory, Doximity Telehealth",
            link: "",
            date: "2022",
            bullets: "Implemented virtual primary care visits, maintaining 96% patient satisfaction and expanding patient access."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "APRN / FNP-C Board Certification", rating: 5 },
            { skill: "Autonomous Primary Care Delivery", rating: 5 },
            { skill: "Prescriptive Authority & Pharmacology", rating: 5 },
            { skill: "Cerner / AthenaHealth EMR", rating: 5 },
            { skill: "Chronic Disease Management", rating: 5 },
            { skill: "Diagnostic Interpretation (Labs/X-Ray)", rating: 4 }
          ],
          descriptions: "Board Certifications: FNP-C (AANP Certified Family Nurse Practitioner), APRN License - Texas, DEA Registration\nClinical Competencies: Primary Care, Physical Exams, Chronic Disease Management (Diabetes/HTN), Diagnostic Interpretation, Telehealth"
        }
      },
      critique: "An advanced practice nursing (FNP) resume on the Onyx preset. Focuses on autonomous patient volume (22+ daily), prescriptive authority, and chronic disease management outcomes."
    },
    {
      id: "hc-medical-assistant",
      persona: {
        name: "Carlos Mendez, CMA",
        location: "San Antonio, TX",
        email: "carlos.mendez@email.com",
      },
      headline: "Certified Medical Assistant (CMA)",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Carlos Mendez, CMA", 
          email: "carlos.mendez@email.com", 
          phone: "(210) 555-0144", 
          location: "San Antonio, TX", 
          website: "", 
          linkedin: "linkedin.com/in/carlosmendez-cma", 
          github: "", 
          summary: "Certified Medical Assistant with 4+ years of clinical and administrative experience in fast-paced outpatient clinics. Skilled in patient rooming, vital signs monitoring, phlebotomy, EKG administration, and EMR documentation in eClinicalWorks."
        },
        workExperiences: [
          { 
            id: "hc-we-4", 
            company: "Alamo Urgent Care & Family Medicine", 
            jobTitle: "Certified Medical Assistant (CMA)", 
            location: "San Antonio, TX", 
            startDate: "Mar 2020", 
            endDate: "Present", 
            current: true, 
            bullets: "Room 30+ patients daily, collecting vital signs, medical histories, and chief complaints in eClinicalWorks EMR.\nPerform capillary blood draws, venipuncture, 12-lead EKGs, and rapid diagnostic lab testing (flu/strep/COVID).\nPrepare sterile procedure trays and assist physicians during minor outpatient surgical procedures." 
          }
        ],
        educations: [
          { 
            id: "hc-ed-3", 
            school: "San Antonio College", 
            degree: "A.A.S. Medical Assisting", 
            location: "San Antonio, TX", 
            startDate: "Aug 2018", 
            endDate: "Dec 2019", 
            gpa: "3.7", 
            coursework: "Clinical Procedures, Medical Terminology, Anatomy & Physiology, EMR Systems" 
          }
        ],
        projects: [
          {
            id: "hc-proj-3",
            name: "Immunization Inventory Automation",
            tech: "eClinicalWorks",
            link: "",
            date: "2023",
            bullets: "Automated vaccine inventory tracking, eliminating expired dose waste."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Certified Medical Assistant (AAMA)", rating: 5 },
            { skill: "Phlebotomy & Venipuncture", rating: 5 },
            { skill: "12-Lead EKG Administration", rating: 5 },
            { skill: "eClinicalWorks / Epic EMR", rating: 4 },
            { skill: "Vital Signs & Patient Rooming", rating: 5 },
            { skill: "BLS Certified (AHA)", rating: 5 }
          ],
          descriptions: "Certifications: CMA (American Association of Medical Assistants), BLS for Healthcare Providers\nClinical Skills: Phlebotomy, EKG, Vital Signs, Rapid Lab Testing, Sterile Instrument Processing, Injections"
        }
      },
      critique: "A clean, efficient Medical Assistant resume using the Modern preset. Highlights patient rooming volume (30+ daily), CMA certification, phlebotomy, and EMR documentation."
    }
  ],

  writingGuide: {
    intro: "A Healthcare or Nursing resume must immediately highlight state licenses, degrees, clinical certifications (BLS/ACLS), patient ratios, and Electronic Medical Record (EMR) software fluency.",
    tips: [
      "Put credentials (BSN, RN, MSN, NP) directly after your name in the header.",
      "List EMR software prominently (Epic, Cerner, Meditech).",
      "Quantify clinical experience: bed capacity, nurse-to-patient ratio, and clinical outcome metrics (e.g., zero infection rate)."
    ],
    headlineExamples: [
      {
        strong: "Registered Nurse (BSN, RN) | Med-Surg & Acute Care | Epic EMR (BLS/ACLS)",
        weak: "Nurse looking for healthcare position",
        explanation: "Presents license, clinical unit specialty, EMR tool, and certifications right away."
      }
    ],
    summaryExamples: [
      {
        strong: "BSN-prepared Registered Nurse with 6+ years of clinical experience in high-volume Acute Care units. Expert in Epic EMR charting and maintaining 98% patient satisfaction scores.",
        weak: "Caring nurse with good bedside manner looking to help patients at a hospital.",
        explanation: "Uses clinical credentials and measurable patient satisfaction metrics."
      }
    ],
    bulletGuidance: "Use: Clinical Action + Unit/Patient Ratio + EMR Tool + Patient Outcome. Example: 'Reduced unit infection rates by 40% through staff training on evidence-based hygiene protocols.'",
    expertQuote: "Nurse recruiters check license verification and EMR software first.",
    faq: [
      {
        q: "Should I include clinical rotations if I am a new grad nurse?",
        a: "Yes! New grads should list completed hospital clinical rotation hours and unit types."
      }
    ],
    relatedRoles: [
      { title: "Nurse Practitioner (NP)", slug: "nurse-practitioner" },
      { title: "Clinical Nurse Manager", slug: "clinical-nurse-manager" },
      { title: "Medical Assistant", slug: "medical-assistant" }
    ]
  }
};
