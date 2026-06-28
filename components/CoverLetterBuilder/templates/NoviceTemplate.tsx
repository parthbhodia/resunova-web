import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function NoviceTemplate({ data, HoverWrapper }: TemplateProps) {
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
      color: "#1e293b",
      lineHeight: 1.6,
      padding: "48px",
      minHeight: "1056px",
      backgroundColor: "#fff"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28pt", fontWeight: "300", letterSpacing: "1px", margin: "0 0 4px 0", color: "#000" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        {recipient.roleTitle && (
          <div style={{ fontSize: "14pt", fontWeight: "600", color: "#64748b", margin: "0 0 12px 0" }}>
            <Wrapper field="recipient.roleTitle">{recipient.roleTitle}</Wrapper>
          </div>
        )}
        <div style={{ fontSize: "9pt", color: "#475569", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <Wrapper field="contact">
            {author.location && <span>📍 {author.location}</span>}
            {author.phone && <span>📞 {author.phone}</span>}
            {author.email && <span>✉️ {author.email}</span>}
            {author.linkedin && <span>🔗 {author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</span>}
          </Wrapper>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #cbd5e1", marginBottom: "32px" }} />

      {/* Date & Recipient */}
      <div style={{ marginBottom: "32px", whiteSpace: "pre-wrap" }}>
        <div style={{ marginBottom: "16px" }}>{today}</div>
        <Wrapper field="recipient">
          {recipient.hiringManagerName && <div>{recipient.hiringManagerName}</div>}
          {recipient.companyName && <div>{recipient.companyName}</div>}
          {recipient.companyAddress && <div>{recipient.companyAddress}</div>}
        </Wrapper>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: "24px" }}>
        Dear {recipient.hiringManagerName ? recipient.hiringManagerName : "Hiring Manager"},
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "justify" }}>
        <Wrapper field="content.openingParagraph">
          <p style={{ margin: 0 }}>{content.openingParagraph || "I am writing to express my interest in..."}</p>
        </Wrapper>
        
        <Wrapper field="content.whyCompany">
          <p style={{ margin: 0 }}>{content.whyCompany || "What draws me to your company is..."}</p>
        </Wrapper>

        <Wrapper field="content.whyFit">
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{content.whyFit || "My background makes me a great fit because..."}</p>
        </Wrapper>

        <Wrapper field="content.closingParagraph">
          <p style={{ margin: 0 }}>{content.closingParagraph || "I look forward to discussing this opportunity..."}</p>
        </Wrapper>
      </div>

      {/* Sign-off */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ marginBottom: "24px" }}>Yours sincerely,</div>
        <Wrapper field="author.name">
          <div>{author.name || "Your Name"}</div>
        </Wrapper>
      </div>
    </div>
  );
}
