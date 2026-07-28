"use client";
import { CL_TEMPLATES, CLTemplateId } from "./types";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  onSelect: (id: CLTemplateId) => void;
  selectedId?: string;
  onBack?: () => void;
}

export default function CoverLetterTemplatePicker({ onSelect, selectedId, onBack }: Props) {
  const router = useRouter();

  return (
    <div className="flex-1 w-full min-h-0 overflow-y-auto bg-surface p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack || (() => router.back())}
          className="flex items-center gap-2 text-sm text-muted hover:text-text mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Choose a template</h1>
          <p className="text-muted text-sm max-w-lg mx-auto">
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
                
                {/* Mock Thumbnail */}
                <div className="w-full aspect-[8.5/11] bg-surface2 rounded-md mb-4 flex flex-col overflow-hidden border border-border">
                  {tpl.id === "professional" && (
                    <div className="p-4 w-full h-full">
                      <div className="w-1/2 h-3 bg-muted rounded mb-1 mx-auto" />
                      <div className="w-1/3 h-2 bg-dim rounded mb-4 mx-auto" />
                      <div className="w-full h-[1px] bg-accent mb-4" />
                      <div className="w-1/4 h-2 bg-muted rounded mb-1" />
                      <div className="w-1/4 h-2 bg-muted rounded mb-4" />
                      <div className="w-full h-2 bg-dim rounded mb-2" />
                      <div className="w-5/6 h-2 bg-dim rounded mb-2" />
                      <div className="w-full h-2 bg-dim rounded mb-2" />
                    </div>
                  )}
                  {tpl.id === "modern" && (
                    <div className="flex w-full h-full">
                      <div className="w-3 bg-accent h-full" />
                      <div className="p-4 flex-1">
                        <div className="w-1/2 h-3 bg-accent rounded mb-1" />
                        <div className="w-1/3 h-2 bg-dim rounded mb-4" />
                        <div className="w-1/4 h-2 bg-muted rounded mb-4" />
                        <div className="w-full h-2 bg-dim rounded mb-2" />
                        <div className="w-5/6 h-2 bg-dim rounded mb-2" />
                        <div className="w-full h-2 bg-dim rounded mb-2" />
                      </div>
                    </div>
                  )}
                  {tpl.id === "minimal" && (
                    <div className="p-4 w-full h-full flex flex-col items-end">
                      <div className="w-1/3 h-3 bg-muted rounded mb-1" />
                      <div className="w-1/4 h-2 bg-dim rounded mb-6" />
                      <div className="w-full h-2 bg-dim rounded mb-2" />
                      <div className="w-5/6 h-2 bg-dim rounded mb-2" />
                      <div className="w-full h-2 bg-dim rounded mb-2" />
                    </div>
                  )}
                  {tpl.id === "creative" && (
                    <div className="w-full h-full flex flex-col">
                      <div className="w-full h-16 bg-gradient-to-br from-accent to-surface3 p-3 text-white">
                        <div className="w-1/2 h-3 bg-white/80 rounded mb-1" />
                        <div className="w-1/3 h-2 bg-white/50 rounded" />
                      </div>
                      <div className="p-4 flex-1">
                        <div className="w-1/4 h-2 bg-muted rounded mb-4" />
                        <div className="w-full h-2 bg-dim rounded mb-2" />
                        <div className="w-5/6 h-2 bg-dim rounded mb-2" />
                        <div className="w-full h-2 bg-dim rounded mb-2" />
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-lg">{tpl.label}</h3>
                <p className="text-sm text-dim mt-1">{tpl.description}</p>
                
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-medium text-muted group-hover:text-accent transition-colors">
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
