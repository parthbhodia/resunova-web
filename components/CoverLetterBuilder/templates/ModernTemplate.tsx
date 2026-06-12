import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function ModernTemplate({ data, HoverWrapper }: TemplateProps) {
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
      flexDirection: "row"
    }}>
      {/* Accent Stripe */}
      <div style={{ width: "32px", backgroundColor: customization.accentColor, flexShrink: 0 }} />

      <div style={{ padding: "48px 48px", flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "28pt", fontWeight: "bold", margin: "0 0 4px 0", color: customization.accentColor, letterSpacing: "-0.5px" }}>
              <Wrapper field="author.name">{author.name || "YOUR NAME"}</Wrapper>
            </h1>
            <div style={{ fontSize: "11pt", fontWeight: "500", color: "#64748b" }}>
              <Wrapper field="recipient.roleTitle">{recipient.roleTitle ? `${recipient.roleTitle} Candidate` : "Cover Letter"}</Wrapper>
            </div>
          </div>
          <div style={{ fontSize: "9pt", color: "#475569", textAlign: "right", lineHeight: 1.5 }}>
            <Wrapper field="contact">
              {author.email && <div>{author.email}</div>}
              {author.phone && <div>{author.phone}</div>}
              {author.location && <div>{author.location}</div>}
              {author.linkedin && <div>{author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
            </Wrapper>
          </div>
        </div>

        {/* Date & Recipient */}
        <div style={{ marginBottom: "32px", whiteSpace: "pre-wrap" }}>
          <div style={{ marginBottom: "16px", fontWeight: "bold" }}>{today}</div>
          <Wrapper field="recipient">
            {recipient.hiringManagerName && <div>{recipient.hiringManagerName}</div>}
            {recipient.companyName && <div style={{ fontWeight: "500" }}>{recipient.companyName}</div>}
            {recipient.companyAddress && <div>{recipient.companyAddress}</div>}
          </Wrapper>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom: "24px" }}>
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
          <div style={{ marginBottom: "16px" }}>Best regards,</div>
          <Wrapper field="author.name">
            <div style={{ fontWeight: "bold" }}>{author.name || "Your Name"}</div>
          </Wrapper>
        </div>
      </div>
    </div>
  );
}
