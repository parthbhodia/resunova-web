"use client";
import React, { useRef, useState, useEffect } from "react";
import { CL_TEMPLATES, CLTemplateId } from "./types";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { CoverLetterPreview } from "./CoverLetterPreview";
import { CLData } from "./types";

const DUMMY_DATA: CLData = {
  recipient: {
    companyName: "Acme Corp",
    hiringManagerName: "Hiring Manager",
    roleTitle: "Software Engineer",
    companyAddress: "123 Tech Lane, SF, CA",
    jobPostingUrl: "https://example.com/job"
  },
  author: {
    name: "Alex Johnson",
    email: "alex@example.com",
    phone: "(555) 123-4567",
    location: "New York, NY",
    linkedin: "linkedin.com/in/alex"
  },
  content: {
    openingParagraph: "I am writing to express my strong interest in the Software Engineer position at Acme Corp. With a background in building scalable web applications, I am excited about the opportunity to contribute to your engineering team.",
    whyCompany: "Acme Corp has always stood out to me because of its commitment to pushing the boundaries of what's possible. I deeply admire your recent launch of the distributed platform.",
    whyFit: "In my previous role, I led the development of a microservices architecture that improved system performance by 40%. My strong proficiency in React and Node.js makes me an excellent fit.",
    closingParagraph: "Thank you for considering my application. I look forward to hearing from you soon."
  },
  customization: {
    templateId: "professional",
    accentColor: "#3b82f6",
    font: "Inter",
    fontSize: "medium",
    dateFormat: "short",
  }
};

interface Props {
  onSelect: (id: CLTemplateId) => void;
  selectedId?: string;
  onBack?: () => void;
}

function ScaledPreview({ tpl }: { tpl: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / 816);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[8.5/11] bg-surface2 rounded-md mb-4 overflow-hidden border border-border"
    >
      <div className="absolute top-0 left-0 origin-top-left" style={{ 
        width: 816, 
        height: 1056, 
        transform: `scale(${scale})`
      }}>
        <CoverLetterPreview 
          data={{
            ...DUMMY_DATA, 
            customization: { ...DUMMY_DATA.customization, templateId: tpl.id }
          }} 
          onEditField={() => {}}
          isReadonly={true}
        />
      </div>
    </div>
  );
}

export default function CoverLetterTemplatePicker({ onSelect, selectedId, onBack }: Props) {
  const router = useRouter();

  return (
    <div className="flex-1 w-full min-h-0 overflow-y-auto bg-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack || (() => router.back())}
          className="flex items-center gap-2 text-sm text-dim hover:text-text mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Choose a template</h1>
          <p className="text-dim text-sm max-w-lg mx-auto">
            Select a design for your cover letter. It should ideally match your résumé style.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CL_TEMPLATES.map((tpl) => {
            const isSelected = selectedId === tpl.id;
            return (
              <div 
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                className={`relative group cursor-pointer rounded-xl border p-5 transition-all bg-surface hover:shadow-lg ${
                  isSelected ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent-h"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-accent text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                
                <ScaledPreview tpl={tpl} />

                <h3 className="font-semibold text-lg">{tpl.label}</h3>
                <p className="text-sm text-dim mt-1">{tpl.description}</p>
                
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-medium text-dim group-hover:text-accent transition-colors">
                    Use this template
                  </span>
                  <span className="text-accent">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
