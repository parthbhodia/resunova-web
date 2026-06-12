import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function CreativeTemplate({ data, HoverWrapper }: TemplateProps) {
  const { author, recipient, content, customization } = data;
  const Wrapper = HoverWrapper || (({ children }) => <>{children}</>);

  const fontFamily = customization.font === "Helvetica" ? "Helvetica, Arial, sans-serif" :
                     customization.font === "Georgia" ? "Georgia, serif" :
                     "Inter, system-ui, sans-serif";
  const fontSize = customization.fontSize === "small" ? "9pt" :
                   customization.fontSize === "large" ? "11pt" : "10pt";

  const today = customization.dateFormat === "short"
    ? new Date().toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      fontFamily,
      fontSize,
      color: "#0f172a",
      lineHeight: 1.6,
      minHeight: "1056px",
      backgroundColor: "#fff",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${customization.accentColor} 0%, #1e293b 100%)`,
        padding: "48px 56px",
        color: "#fff"
      }}>
        <h1 style={{ fontSize: "28pt", fontWeight: "900", margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        <div style={{ fontSize: "10pt", opacity: 0.9, display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <Wrapper field="contact">
            {author.email && <span>{author.email}</span>}
            {author.phone && <span>{author.phone}</span>}
            {author.location && <span>{author.location}</span>}
            {author.linkedin && <span>{author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
          </Wrapper>
        </div>
      </div>

      <div style={{ padding: "48px 56px", flex: 1 }}>
        {/* Date & Recipient */}
        <div style={{ marginBottom: "32px", whiteSpace: "pre-wrap", display: "flex", justifyContent: "space-between" }}>
          <Wrapper field="recipient">
            <div>
              {recipient.hiringManagerName && <div style={{ fontWeight: "600" }}>{recipient.hiringManagerName}</div>}
              {recipient.roleTitle && <div style={{ color: customization.accentColor }}>{recipient.roleTitle}</div>}
              {recipient.companyName && <div>{recipient.companyName}</div>}
              {recipient.companyAddress && <div>{recipient.companyAddress}</div>}
            </div>
          </Wrapper>
          <div style={{ fontWeight: "500", color: "#64748b" }}>{today}</div>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom: "24px", fontSize: "11pt", fontWeight: "600" }}>
          Dear {recipient.hiringManagerName ? recipient.hiringManagerName : "Hiring Manager"},
        </div>

        {/* Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Wrapper field="content.openingParagraph">
            <p style={{ margin: 0 }}>{content.openingParagraph || "I am writing to express my interest in..."}</p>
          </Wrapper>
          
          <Wrapper field="content.whyCompany">
            <p style={{ margin: 0 }}>{content.whyCompany || "What draws me to your company is..."}</p>
          </Wrapper>

          <Wrapper field="content.whyFit">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{content.whyFit || "My background in X makes me a great fit because..."}</p>
          </Wrapper>

          <Wrapper field="content.closingParagraph">
            <p style={{ margin: 0 }}>{content.closingParagraph || "I look forward to discussing this opportunity..."}</p>
          </Wrapper>
        </div>

        {/* Sign-off */}
        <div style={{ marginTop: "40px" }}>
          <div style={{ marginBottom: "16px" }}>Best,</div>
          <Wrapper field="author.name">
            <div style={{ fontWeight: "700", color: customization.accentColor }}>{author.name || "Your Name"}</div>
          </Wrapper>
        </div>
      </div>
    </div>
  );
}
