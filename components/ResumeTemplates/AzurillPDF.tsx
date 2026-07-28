"use client";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { TBResumeData, TBFont } from "../TemplateBuilder/types";
import { getResumePageWidth, getResumeStylePreset } from "@/lib/resumeLayout";
import { isCoreSectionSlot, parseCustomSectionId } from "../TemplateBuilder/types";

function parseBullets(raw: string): string[] {
  return raw.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

function makeBoldFamily(font: TBFont): string {
  if (font === "Times-Roman") return "Times-Bold";
  if (font === "Courier") return "Courier-Bold";
  return "Helvetica-Bold";
}

function makeStyles(font: TBFont, accent: string, stylePreset = getResumeStylePreset(), pageWidth = getResumePageWidth()) {
  const bold = makeBoldFamily(font);
  return StyleSheet.create({
    page: {
      fontFamily: font,
      fontSize: stylePreset.baseFont,
      color: "#1a1a1a",
      lineHeight: stylePreset.lineHeight,
      flexDirection: "row", // Two columns
    },
    sidebar: {
      width: "35%",
      backgroundColor: accent,
      color: "#ffffff",
      paddingTop: pageWidth.paddingY,
      paddingBottom: pageWidth.paddingY,
      paddingHorizontal: Math.round(pageWidth.paddingX * 0.85),
    },
    main: {
      width: "65%",
      paddingTop: pageWidth.paddingY,
      paddingBottom: pageWidth.paddingY,
      paddingHorizontal: pageWidth.paddingX,
    },
    name: {
      fontSize: stylePreset.nameFont * 0.9,
      fontFamily: bold,
      letterSpacing: 0.5,
      marginBottom: 12,
      color: "#ffffff",
      width: "100%",
    },
    contactItem: { 
      fontSize: stylePreset.metaFont,
      color: "#f1f1f1",
      marginBottom: 4,
    },
    sectionTitleMain: {
      fontSize: stylePreset.sectionFont,
      fontFamily: bold,
      textTransform: "uppercase",
      letterSpacing: stylePreset.letterSpacing,
      color: accent,
      marginBottom: 5,
      paddingBottom: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: accent,
    },
    sectionTitleSidebar: {
      fontSize: stylePreset.sectionFont,
      fontFamily: bold,
      textTransform: "uppercase",
      letterSpacing: stylePreset.letterSpacing,
      color: "#ffffff",
      marginBottom: 5,
      paddingBottom: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: "rgba(255,255,255,0.5)",
    },
    section: { marginBottom: stylePreset.sectionGap },
    jobRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
    jobTitleMain: { fontSize: stylePreset.baseFont, fontFamily: bold, color: "#111111" },
    jobTitleSidebar: { fontSize: stylePreset.baseFont, fontFamily: bold, color: "#ffffff" },
    companyMain: { fontSize: stylePreset.baseFont - 0.5, color: "#333333" },
    companySidebar: { fontSize: stylePreset.baseFont - 0.5, color: "#f1f1f1" },
    dateLocationMain: { fontSize: stylePreset.metaFont, color: "#666666" },
    dateLocationSidebar: { fontSize: stylePreset.metaFont, color: "#e5e5e5" },
    bullet: { fontSize: stylePreset.bodyFont, marginLeft: 12, marginBottom: stylePreset.bulletGap, flexDirection: "row" },
    bulletDotMain: { width: 10, color: "#444444" },
    bulletDotSidebar: { width: 10, color: "#e5e5e5" },
    bulletTextMain: { flex: 1, color: "#222222" },
    bulletTextSidebar: { flex: 1, color: "#ffffff" },
    summaryText: { fontSize: stylePreset.bodyFont, color: "#333333", lineHeight: stylePreset.summaryLineHeight },
    skillsText: { fontSize: stylePreset.bodyFont, color: "#ffffff", lineHeight: stylePreset.skillsLineHeight },
    metaSmallMain: { fontSize: stylePreset.metaFont, color: "#666666" },
    metaSmallSidebar: { fontSize: stylePreset.metaFont, color: "#e5e5e5" },
  });
}

function BulletMain({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDotMain}>•</Text>
      <Text style={styles.bulletTextMain}>{text}</Text>
    </View>
  );
}

function BulletSidebar({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDotSidebar}>•</Text>
      <Text style={styles.bulletTextSidebar}>{text}</Text>
    </View>
  );
}

const TWO_COL_SIDEBAR_CORE = new Set(["education", "skills"]);

function isSidebarSlot(slot: string): boolean {
  if (TWO_COL_SIDEBAR_CORE.has(slot)) return true;
  if (parseCustomSectionId(slot) !== null) return true;
  return false;
}

interface Props { data: TBResumeData }

export function AzurillPDF({ data }: Props) {
  const { profile, workExperiences, educations, projects, skills, customization, sectionOrder, hiddenSections } = data;
  const preset = getResumeStylePreset(customization?.stylePreset);
  const pageWidth = getResumePageWidth(customization?.pageWidth);
  const font = customization?.font ?? preset.font;
  const accent = customization?.accentColor ?? preset.accentColor;
  const styles = makeStyles(font, accent, preset, pageWidth);
  const hidden = new Set(hiddenSections ?? []);

  const contactParts = [
    profile.email, profile.phone, profile.location,
    profile.website, profile.linkedin, profile.github,
  ].filter(Boolean);

  const featuredWithSkill = skills.featuredSkills.filter((f) => f.skill.trim());
  
  const visibleSlots = sectionOrder.filter((s) => !hidden.has(s));
  const sidebarSlots = visibleSlots.filter(isSidebarSlot);
  const mainSlots    = visibleSlots.filter((s) => !isSidebarSlot(s));

  const renderSection = (slot: string, isSidebar: boolean) => {
    switch (slot) {
      case "summary":
        if (!profile.summary) return null;
        return (
          <View key={slot} style={styles.section}>
            <Text style={isSidebar ? styles.sectionTitleSidebar : styles.sectionTitleMain}>Summary</Text>
            <Text style={styles.summaryText}>{profile.summary}</Text>
          </View>
        );
      case "experience":
        if (workExperiences.filter((w) => w.company || w.jobTitle).length === 0) return null;
        return (
          <View key={slot} style={styles.section}>
            <Text style={isSidebar ? styles.sectionTitleSidebar : styles.sectionTitleMain}>Experience</Text>
            {workExperiences.filter((w) => w.company || w.jobTitle).map((w) => {
              const dateStr = [w.startDate, w.current ? "Present" : w.endDate].filter(Boolean).join(" – ");
              const bullets = parseBullets(w.bullets);
              return (
                <View key={w.id} style={{ marginBottom: preset.entryGap }}>
                  <View style={styles.jobRow}>
                    <Text style={isSidebar ? styles.jobTitleSidebar : styles.jobTitleMain}>{w.jobTitle || "Job Title"}</Text>
                    <Text style={isSidebar ? styles.dateLocationSidebar : styles.dateLocationMain}>{dateStr}</Text>
                  </View>
                  <View style={styles.jobRow}>
                    <Text style={isSidebar ? styles.companySidebar : styles.companyMain}>{w.company}</Text>
                    {w.location ? <Text style={isSidebar ? styles.dateLocationSidebar : styles.dateLocationMain}>{w.location}</Text> : null}
                  </View>
                  {bullets.map((b, i) => isSidebar ? <BulletSidebar key={i} text={b} styles={styles} /> : <BulletMain key={i} text={b} styles={styles} />)}
                </View>
              );
            })}
          </View>
        );
      case "education":
        if (educations.filter((e) => e.school || e.degree).length === 0) return null;
        return (
          <View key={slot} style={styles.section}>
            <Text style={isSidebar ? styles.sectionTitleSidebar : styles.sectionTitleMain}>Education</Text>
            {educations.filter((e) => e.school || e.degree).map((e) => {
              const dateStr = [e.startDate, e.endDate].filter(Boolean).join(" – ");
              return (
                <View key={e.id} style={{ marginBottom: Math.max(5, preset.entryGap - 2) }}>
                  <View style={styles.jobRow}>
                    <Text style={isSidebar ? styles.jobTitleSidebar : styles.jobTitleMain}>{e.school || "School"}</Text>
                    <Text style={isSidebar ? styles.dateLocationSidebar : styles.dateLocationMain}>{dateStr}</Text>
                  </View>
                  <View style={styles.jobRow}>
                    <Text style={isSidebar ? styles.companySidebar : styles.companyMain}>{e.degree}</Text>
                    {e.gpa ? <Text style={isSidebar ? styles.dateLocationSidebar : styles.dateLocationMain}>GPA: {e.gpa}</Text> : null}
                  </View>
                  {e.location ? <Text style={isSidebar ? styles.metaSmallSidebar : styles.metaSmallMain}>{e.location}</Text> : null}
                  {e.coursework ? (
                    <Text style={isSidebar ? styles.metaSmallSidebar : styles.metaSmallMain}>Coursework: {e.coursework}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      case "projects":
        if (projects.filter((p) => p.name).length === 0) return null;
        return (
          <View key={slot} style={styles.section}>
            <Text style={isSidebar ? styles.sectionTitleSidebar : styles.sectionTitleMain}>Projects</Text>
            {projects.filter((p) => p.name).map((p) => {
              const bullets = parseBullets(p.bullets);
              return (
                <View key={p.id} style={{ marginBottom: Math.max(5, preset.entryGap - 2) }}>
                  <View style={styles.jobRow}>
                    <Text style={isSidebar ? styles.jobTitleSidebar : styles.jobTitleMain}>
                      {p.name}{p.tech ? `  |  ${p.tech}` : ""}
                    </Text>
                    {p.date ? <Text style={isSidebar ? styles.dateLocationSidebar : styles.dateLocationMain}>{p.date}</Text> : null}
                  </View>
                  {p.link ? <Text style={isSidebar ? styles.metaSmallSidebar : styles.metaSmallMain}>{p.link}</Text> : null}
                  {bullets.map((b, i) => isSidebar ? <BulletSidebar key={i} text={b} styles={styles} /> : <BulletMain key={i} text={b} styles={styles} />)}
                </View>
              );
            })}
          </View>
        );
      case "skills":
        if (featuredWithSkill.length === 0 && !skills.descriptions.trim()) return null;
        return (
          <View key={slot} style={styles.section}>
            <Text style={isSidebar ? styles.sectionTitleSidebar : styles.sectionTitleMain}>Skills</Text>
            
            {featuredWithSkill.length > 0 && (
              <View style={{ flexDirection: "column", marginBottom: 5 }}>
                {featuredWithSkill.map((fs, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ fontSize: preset.metaFont, color: isSidebar ? "#ffffff" : "#222", flex: 1 }}>{fs.skill}</Text>
                    {Array.from({ length: 5 }, (_, ci) => (
                      <View key={ci} style={{
                        width: 6, height: 6, borderRadius: 3, marginLeft: 2,
                        backgroundColor: ci < fs.rating ? (isSidebar ? "#ffffff" : accent) : (isSidebar ? "rgba(255,255,255,0.3)" : "#d9d9d9"),
                      }} />
                    ))}
                  </View>
                ))}
              </View>
            )}

            {skills.descriptions.trim() ? (
              skills.descriptions.split("\n").filter(Boolean).map((line, i) => (
                <Text key={i} style={isSidebar ? styles.skillsText : styles.summaryText}>{line}</Text>
              ))
            ) : null}
          </View>
        );
      default:
        // Handle custom sections if any
        return null;
    }
  };

  return (
    <Document title={profile.name ? `${profile.name} Resume` : "Resume"}>
      <Page size="LETTER" style={styles.page}>
        
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.name}>{profile.name || "Your Name"}</Text>
          <View style={{ marginBottom: 20 }}>
            {contactParts.map((c, i) => (
              <Text key={i} style={styles.contactItem}>{c}</Text>
            ))}
          </View>
          
          {sidebarSlots.map(slot => renderSection(slot, true))}
        </View>

        {/* Main Column */}
        <View style={styles.main}>
          {mainSlots.map(slot => renderSection(slot, false))}
        </View>

      </Page>
    </Document>
  );
}
