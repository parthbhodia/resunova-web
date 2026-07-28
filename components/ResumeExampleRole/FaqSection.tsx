"use client";

import { RolePageData } from "@/lib/resumeExampleRoles/types";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqSection({ faqs }: { faqs: RolePageData["writingGuide"]["faq"] }) {
  return (
    <div className="mb-20">
      <h2 className="mb-8 text-2xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
      <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
        {faqs.map((faq, i) => (
          <FaqItem key={i} question={faq.q} answer={faq.a} />
        ))}
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left focus:outline-none"
      >
        <span className="text-lg font-semibold text-slate-900">{question}</span>
        <ChevronDown
          className={`size-5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="mt-3 pr-8 text-slate-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
