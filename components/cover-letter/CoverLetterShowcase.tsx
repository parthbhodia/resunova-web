"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { mutedTextSx, surfaceCardSx } from "@/components/mui/cssVars";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { CoverLetterPreview } from "@/components/CoverLetterBuilder/CoverLetterPreview";
import { DUMMY_DATA } from "@/components/CoverLetterBuilder/CoverLetterTemplatePicker";
import { CL_TEMPLATES, type CLTemplateId } from "@/components/CoverLetterBuilder/types";

/**
 * Top of /cover-letter/. Same purple panel as the homepage examples block,
 * with one builder preview beside it and the real layout templates below.
 * These are page designs, not career examples.
 */

function LetterFrame({ templateId, tall }: { templateId: CLTemplateId; tall?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.42);

  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / 816);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={frame}
      sx={{
        position: "relative",
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        bgcolor: "#fff",
        border: tall ? "1px solid var(--border)" : "none",
        boxShadow: tall ? "0 16px 40px rgba(28, 25, 23, 0.14)" : "none",
        borderRadius: tall ? "20px" : 0,
        height: tall ? { xs: 420, md: 520 } : undefined,
        aspectRatio: tall ? undefined : "8.5 / 11",
      }}
      aria-hidden
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 816,
          height: 1056,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <CoverLetterPreview
          data={{ ...DUMMY_DATA, customization: { ...DUMMY_DATA.customization, templateId } }}
          onEditField={() => {}}
          isReadonly
        />
      </Box>
    </Box>
  );
}

export default function CoverLetterShowcase() {
  return (
    <MuiThemeRegistry>
      <Box component="section" aria-labelledby="cl-hero-heading" sx={{ maxWidth: 1080, mx: "auto", mb: 7 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              bgcolor: "#6a6ff0",
              borderRadius: "28px",
              px: { xs: 3, sm: 4.5 },
              py: { xs: 5, sm: 7 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              id="cl-hero-heading"
              variant="h1"
              sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.035em", fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.12, m: 0 }}
            >
              A cover letter written from your resume.
            </Typography>
            <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.9)", fontSize: 16, lineHeight: 1.55, maxWidth: 460 }}>
              Paste the job description. The draft uses your real experience, then you edit every line and download a PDF.
            </Typography>
            <Button
              component={Link}
              href="/?view=cover-letter"
              variant="contained"
              sx={{ mt: 3.5, alignSelf: "flex-start", bgcolor: "#f5c400", color: "#1c1917", "&:hover": { bgcolor: "#ffd21a" } }}
            >
              Write my cover letter
            </Button>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <LetterFrame templateId="professional" tall />
            <Typography variant="body2" sx={{ ...mutedTextSx, mt: 1, textAlign: "center" }}>
              Layout preview. The name and employer are sample text.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 7 }}>
          <Typography variant="h2" sx={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", mb: 1, color: "var(--text)" }}>
            Layouts
          </Typography>
          <Typography sx={{ ...mutedTextSx, mb: 3, maxWidth: 560 }}>
            Page designs you can start from. These are not sample letters for a career.
          </Typography>
          <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {CL_TEMPLATES.map((template) => (
              <Card key={template.id} variant="outlined" sx={{ ...surfaceCardSx, display: "flex", flexDirection: "column", overflow: "hidden", p: 0 }}>
                <LetterFrame templateId={template.id} />
                <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{template.label}</Typography>
                  <Typography variant="body2" sx={{ ...mutedTextSx, mt: 0.5, mb: 2, flex: 1 }}>
                    {template.description}
                  </Typography>
                  <Button component={Link} href="/?view=cover-letter" variant="text" sx={{ alignSelf: "flex-start", px: 0, color: "var(--accent)" }}>
                    Open in the builder
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </MuiThemeRegistry>
  );
}
