import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function TechTemplate({ data, HoverWrapper }: TemplateProps) {
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
      color: "#334155",
      lineHeight: 1.6,
      padding: "48px",
      minHeight: "1056px",
      backgroundColor: "#fff"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "22pt", fontWeight: "700", margin: "0 0 8px 0", color: "#0f172a" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        <div style={{ fontFamily: "monospace", fontSize: "10pt", color: customization.accentColor, marginBottom: "16px" }}>
          {recipient.roleTitle ? <Wrapper field="recipient.roleTitle">{"< " + recipient.roleTitle + " />"}</Wrapper> : "< Software Engineer />"}
        </div>
        
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "9pt", fontFamily: "monospace", color: "#64748b" }}>
          <Wrapper field="contact">
            {author.email && <div>{author.email}</div>}
            {author.phone && <div>{author.phone}</div>}
            {author.linkedin && <div>{author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
          </Wrapper>
        </div>
      </div>

      <div style={{ borderBottom: `2px dashed ${customization.accentColor}`, marginBottom: "32px", opacity: 0.5 }} />

      {/* Date & Recipient */}
      <div style={{ marginBottom: "32px", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "9pt" }}>
        <div style={{ marginBottom: "16px" }}>// {today}</div>
        <Wrapper field="recipient">
          {recipient.hiringManagerName && <div>To: {recipient.hiringManagerName}</div>}
          {recipient.companyName && <div>@ {recipient.companyName}</div>}
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
        <div style={{ marginBottom: "24px" }}>Best regards,</div>
        <Wrapper field="author.name">
          <div>{author.name || "Your Name"}</div>
        </Wrapper>
      </div>
    </div>
  );
}
