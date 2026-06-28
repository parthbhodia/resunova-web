export interface CLRecipient {
    companyName: string;
    hiringManagerName: string;
    roleTitle: string;
    jobPostingUrl: string;
    companyAddress: string;
}

export interface CLAuthor {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    location: string;
}

export interface CLContent {
    openingParagraph: string;
    whyCompany: string;
    whyFit: string;
    closingParagraph: string;
}

export type CLTemplateId = "professional" | "modern" | "minimal" | "creative" | "novice" | "madona" | "wakanda" | "london" | "tech" | "elegant";

export interface CLCustomization {
    templateId: CLTemplateId;
    accentColor: string;
    font: "Helvetica" | "Georgia" | "Inter";
    fontSize: "small" | "medium" | "large";
    dateFormat: "long" | "short";
}

export interface CLData {
    recipient: CLRecipient;
    author: CLAuthor;
    content: CLContent;
    customization: CLCustomization;
}

export const DEFAULT_CL_DATA: CLData = {
    recipient: {
        companyName: "",
        hiringManagerName: "",
        roleTitle: "",
        jobPostingUrl: "",
        companyAddress: ""
    },
    author: {
        name: "",
        email: "",
        phone: "",
        linkedin: "",
        location: ""
    },
    content: {
        openingParagraph: "",
        whyCompany: "",
        whyFit: "",
        closingParagraph: ""
    },
    customization: {
        templateId: "professional",
        accentColor: "#58a6ff",
        font: "Helvetica",
        fontSize: "medium",
        dateFormat: "long"
    }
};

export const CL_TEMPLATES: { id: CLTemplateId; label: string; description: string }[] = [
    { id: "professional", label: "Professional", description: "Classic two-line header, clean serif. ATS-safe." },
    { id: "modern", label: "Modern", description: "Bold left accent stripe, strong typography." },
    { id: "minimal", label: "Minimal", description: "Pure text, no frills. Works everywhere." },
    { id: "creative", label: "Creative", description: "Gradient header. For design/creative roles." },
    { id: "novice", label: "Novice Cover Letter", description: "A comprehensive, beginner-friendly cover letter." },
    { id: "madona", label: "Madona Cover Letter", description: "A comprehensive, professional cover letter designed to help you stand out." },
    { id: "wakanda", label: "Wakanda Cover Letter", description: "A comprehensive, high-impact cover letter built to help you win interviews." },
    { id: "london", label: "London Cover Letter", description: "A comprehensive, professional cover letter designed to help you stand out." },
    { id: "tech", label: "Tech Cover Letter", description: "A sleek, monospace-accented layout perfect for engineering roles." },
    { id: "elegant", label: "Elegant Cover Letter", description: "A refined, classic serif design with elegant spacing." },
];
