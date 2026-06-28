import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function ElegantTemplate({ data, HoverWrapper }: TemplateProps) {
  const { author, recipient, content, customization } = data;
  const Wrapper = HoverWrapper || (({ children }) => <>{children}</>);

  const fontFamily = "Georgia, serif"; // Force serif for elegant template

  const fontSize = customization.fontSize === "small" ? "9pt" :
                   customization.fontSize === "large" ? "11pt" : "10pt";

  const today = customization.dateFormat === "short"
    ? new Date().toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      fontFamily,
      fontSize,
      color: "#27272a",
      lineHeight: 1.8,
      padding: "56px",
      minHeight: "1056px",
      backgroundColor: "#fdfbf7" // slight off-white paper color
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "26pt", fontWeight: "normal", letterSpacing: "4px", textTransform: "uppercase", margin: "0 0 16px 0", color: "#18181b" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        <div style={{ fontSize: "9pt", color: "#52525b", letterSpacing: "1px", textTransform: "uppercase" }}>
          <Wrapper field="contact">
            {author.location && <span>{author.location}  |  </span>}
            {author.phone && <span>{author.phone}  |  </span>}
            {author.email && <span>{author.email}</span>}
          </Wrapper>
        </div>
      </div>

      {/* Date & Recipient */}
      <div style={{ marginBottom: "40px", whiteSpace: "pre-wrap" }}>
        <div style={{ marginBottom: "20px", fontStyle: "italic" }}>{today}</div>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "justify" }}>
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
      <div style={{ marginTop: "40px" }}>
        <div style={{ marginBottom: "32px" }}>Sincerely,</div>
        <Wrapper field="author.name">
          <div style={{ fontStyle: "italic", fontSize: "14pt" }}>{author.name || "Your Name"}</div>
        </Wrapper>
      </div>
    </div>
  );
}
