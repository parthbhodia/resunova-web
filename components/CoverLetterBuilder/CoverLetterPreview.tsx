import React, { useState, forwardRef } from "react";
import { CLData } from "./types";
import { ProfessionalTemplate } from "./templates/ProfessionalTemplate";
import { ModernTemplate } from "./templates/ModernTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { NoviceTemplate } from "./templates/NoviceTemplate";
import { MadonaTemplate } from "./templates/MadonaTemplate";
import { WakandaTemplate } from "./templates/WakandaTemplate";
import { LondonTemplate } from "./templates/LondonTemplate";
import { TechTemplate } from "./templates/TechTemplate";
import { ElegantTemplate } from "./templates/ElegantTemplate";

interface Props {
  data: CLData;
  onEditField: (field: string, rect: DOMRect) => void;
  isReadonly?: boolean;
}

const TEMPLATE_MAP = {
  professional: ProfessionalTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  creative: CreativeTemplate,
  novice: NoviceTemplate,
  madona: MadonaTemplate,
  wakanda: WakandaTemplate,
  london: LondonTemplate,
  tech: TechTemplate,
  elegant: ElegantTemplate,
};

export const CoverLetterPreview = forwardRef<HTMLDivElement, Props>(({ data, onEditField, isReadonly }, ref) => {
  const TemplateComponent = TEMPLATE_MAP[data.customization.templateId] || ProfessionalTemplate;

  const HoverWrapper: React.FC<{ field: string; children: React.ReactNode }> = ({ field, children }) => {
    const [hovered, setHovered] = useState(false);
    
    if (isReadonly) {
      return <>{children}</>;
    }

    return (
      <div 
        style={{ position: "relative", cursor: "text" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onEditField(field, e.currentTarget.getBoundingClientRect());
        }}
      >
        {children}
        {hovered && (
          <div className="az-pdf-ignore" style={{
            position: "absolute", top: -8, right: -8, 
            background: "var(--accent)", color: "#fff", 
            padding: "2px 6px", fontSize: "10px", borderRadius: "4px",
            fontWeight: "bold", zIndex: 10, cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            ✏️ Edit
          </div>
        )}
        {hovered && (
          <div className="az-pdf-ignore" style={{
            position: "absolute", inset: "-4px -6px",
            border: "1.5px dashed var(--accent)", borderRadius: "4px",
            pointerEvents: "none", zIndex: 1
          }} />
        )}
      </div>
    );
  };

  return (
    <div 
      ref={ref}
      style={{
        width: "8.5in",
        minHeight: "11in",
        backgroundColor: "var(--resume-paper-bg, #ffffff)",
        boxShadow: "var(--shadow-card)",
        position: "relative",
        overflow: "hidden" 
      }}
    >
      <TemplateComponent data={data} HoverWrapper={HoverWrapper} />
    </div>
  );
});

CoverLetterPreview.displayName = "CoverLetterPreview";
