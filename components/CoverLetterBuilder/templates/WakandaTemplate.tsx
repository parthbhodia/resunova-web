import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function WakandaTemplate({ data, HoverWrapper }: TemplateProps) {
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

  // Wakanda template uses a dark header block. 
  // We'll use a deep slate or the accent color if it's dark enough, but for consistency we'll use a fixed dark gray/blue.
  const headerBg = "#334155"; 

  return (
    <div style={{
      fontFamily,
      fontSize,
      color: "#1e293b",
      lineHeight: 1.6,
      minHeight: "1056px",
      backgroundColor: "#fff",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Dark Header */}
      <div style={{ backgroundColor: headerBg, color: "#fff", padding: "48px" }}>
        <h1 style={{ fontSize: "28pt", fontWeight: "700", textTransform: "uppercase", margin: "0 0 8px 0" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        {recipient.roleTitle && (
          <div style={{ fontSize: "14pt", fontWeight: "400", margin: "0 0 24px 0", opacity: 0.9 }}>
            <Wrapper field="recipient.roleTitle">{recipient.roleTitle}</Wrapper>
          </div>
        )}
        <div style={{ fontSize: "10pt", display: "flex", gap: "20px", flexWrap: "wrap", opacity: 0.8 }}>
          <Wrapper field="contact">
            {author.email && <div>✉️ {author.email}</div>}
            {author.phone && <div>📞 {author.phone}</div>}
            {author.location && <div>📍 {author.location}</div>}
            {author.linkedin && <div>🔗 {author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
          </Wrapper>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "48px", flex: 1 }}>
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
    </div>
  );
}
