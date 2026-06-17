import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function MinimalTemplate({ data, HoverWrapper }: TemplateProps) {
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
      lineHeight: 1.7,
      padding: "56px",
      minHeight: "1056px",
      backgroundColor: "#fff"
    }}>
      {/* Header - Right aligned */}
      <div style={{ textAlign: "right", marginBottom: "48px" }}>
        <h1 style={{ fontSize: "14pt", fontWeight: "bold", margin: "0 0 8px 0" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        <div style={{ fontSize: "10pt", color: "#64748b" }}>
          <Wrapper field="contact">
            {author.email && <div>{author.email}</div>}
            {author.phone && <div>{author.phone}</div>}
            {author.linkedin && <div>{author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
          </Wrapper>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: "32px", fontSize: "10pt" }}>
        {today}
      </div>

      {/* Recipient */}
      <div style={{ marginBottom: "32px", whiteSpace: "pre-wrap", fontSize: "10pt" }}>
        <Wrapper field="recipient">
          {recipient.hiringManagerName && <div>{recipient.hiringManagerName}</div>}
          {recipient.roleTitle && <div>{recipient.roleTitle} Team</div>}
          {recipient.companyName && <div>{recipient.companyName}</div>}
          {recipient.companyAddress && <div>{recipient.companyAddress}</div>}
        </Wrapper>
      </div>

      {/* Salutation */}
      <div style={{ marginBottom: "24px" }}>
        Dear {recipient.hiringManagerName ? recipient.hiringManagerName : "Hiring Manager"},
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
      <div style={{ marginTop: "48px" }}>
        <div style={{ marginBottom: "32px" }}>Best,</div>
        <Wrapper field="author.name">
          <div>{author.name || "Your Name"}</div>
        </Wrapper>
      </div>
    </div>
  );
}
