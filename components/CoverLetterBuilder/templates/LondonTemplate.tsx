import React from "react";
import { CLData } from "../types";

interface TemplateProps {
  data: CLData;
  HoverWrapper?: React.FC<{ field: string; children: React.ReactNode }>;
}

export function LondonTemplate({ data, HoverWrapper }: TemplateProps) {
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
      minHeight: "1056px",
      backgroundColor: "#fff",
      display: "flex"
    }}>
      {/* Left Sidebar */}
      <div style={{ width: "30%", padding: "48px 32px", borderRight: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
        {/* Removed Initials Logo */}

        {/* Name & Title */}
        <h1 style={{ fontSize: "20pt", fontWeight: "700", textTransform: "uppercase", margin: "0 0 8px 0", color: "#0f172a", wordWrap: "break-word" }}>
          <Wrapper field="author.name">{author.name || "Your Name"}</Wrapper>
        </h1>
        {recipient.roleTitle && (
          <div style={{ fontSize: "11pt", fontWeight: "500", color: "#475569", marginBottom: "48px" }}>
            <Wrapper field="recipient.roleTitle">{recipient.roleTitle}</Wrapper>
          </div>
        )}

        {/* Contact Block */}
        <div style={{ marginBottom: "16px", fontSize: "12pt", fontWeight: "700", color: "#0f172a", borderBottom: "1px solid #cbd5e1", paddingBottom: "8px" }}>
          Contact
        </div>
        <div style={{ fontSize: "9pt", color: "#475569", display: "flex", flexDirection: "column", gap: "12px", wordWrap: "break-word" }}>
          <Wrapper field="contact">
            {author.email && <div><strong>Email</strong><br/>{author.email}</div>}
            {author.phone && <div><strong>Phone</strong><br/>{author.phone}</div>}
            {author.location && <div><strong>Location</strong><br/>{author.location}</div>}
            {author.linkedin && <div><strong>LinkedIn</strong><br/>{author.linkedin.replace(/^https?:\/\/(www\.)?/, '')}</div>}
          </Wrapper>
        </div>
      </div>

      {/* Right Content Area */}
      <div style={{ width: "70%", padding: "48px" }}>
        
        {/* Recipient info & Date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px" }}>
          <div style={{ fontSize: "9pt", color: "#475569" }}>
            <Wrapper field="recipient">
              {recipient.hiringManagerName && <div style={{ fontWeight: "700", color: "#0f172a" }}>{recipient.hiringManagerName}</div>}
              {recipient.companyName && <div>{recipient.companyName}</div>}
              {recipient.companyAddress && <div style={{ whiteSpace: "pre-wrap" }}>{recipient.companyAddress}</div>}
            </Wrapper>
          </div>
          <div style={{ fontSize: "10pt", fontWeight: "500" }}>{today}</div>
        </div>

        {/* Salutation */}
        <div style={{ marginBottom: "24px", fontWeight: "500" }}>
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
        <div style={{ marginTop: "40px" }}>
          <div style={{ marginBottom: "32px" }}>Yours sincerely,</div>
          <Wrapper field="author.name">
            <div style={{ fontWeight: "600", fontSize: "12pt" }}>{author.name || "Your Name"}</div>
          </Wrapper>
        </div>
      </div>
    </div>
  );
}
