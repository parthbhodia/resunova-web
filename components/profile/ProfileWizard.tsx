"use client";

import React, { useState } from "react";
import PersonalInfoSection from "./PersonalInfoSection";
import EducationSection from "./EducationSection";
import SkillsSection from "./SkillsSection";
import ExperienceSection from "./ExperienceSection";
import ProjectsSection from "./ProjectsSection";

const STEPS = ["Personal Info", "Education", "Skills", "Experience", "Projects", "Review"];

export default function ProfileWizard({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
    else onComplete();
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <PersonalInfoSection />;
      case 1:
        return <EducationSection />;
      case 2:
        return <SkillsSection />;
      case 3:
        return <ExperienceSection />;
      case 4:
        return <ProjectsSection />;
      case 5:
        return (
          <div style={{ textAlign: "center", padding: 40 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>Ready to publish!</h3>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              Please review your details. You can always edit them later.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--surface)", overflow: "hidden" }}>
      {/* Progress Bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface2)", padding: "16px 24px", gap: 12, overflowX: "auto" }}>
        {STEPS.map((step, idx) => (
          <div
            key={step}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 99,
              whiteSpace: "nowrap",
              background: idx === currentStep ? "var(--accent)" : idx < currentStep ? "var(--green)" : "transparent",
              color: idx <= currentStep ? "#fff" : "var(--muted)",
              border: idx > currentStep ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {idx + 1}. {step}
          </div>
        ))}
      </div>

      <div style={{ padding: "32px 24px", minHeight: 300 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--text)" }}>{STEPS[currentStep]}</h2>
        {renderStepContent()}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: "var(--radius)",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text)",
            cursor: currentStep === 0 ? "not-allowed" : "pointer",
            opacity: currentStep === 0 ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={nextStep}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 24px",
            borderRadius: "var(--radius)",
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          {currentStep === STEPS.length - 1 ? "Publish Profile" : "Next"}
        </button>
      </div>
    </div>
  );
}
