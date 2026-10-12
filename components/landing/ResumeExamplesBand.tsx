"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { RESUME_CATEGORIES, TOTAL_RESUME_EXAMPLES } from "@/lib/resumeExampleCategories";
import { roleDataYear } from "@/lib/roleResumeData";

/**
 * Homepage category picker. Each chip lands on a section of /resume-examples/.
 * MUI is scoped to this block so the rest of the landing page does not pay
 * for Emotion.
 */

export default function ResumeExamplesBand() {
  const year = roleDataYear();

  return (
    <MuiThemeRegistry>
      <Box component="section" aria-labelledby="lp-examples-heading" sx={{ px: 2.5, pt: 1, pb: 3.5 }}>
        <Box
          sx={{
            maxWidth: 1080,
            mx: "auto",
            bgcolor: "#6a6ff0",
            borderRadius: "28px",
            px: { xs: 2, sm: 3.5 },
            pt: { xs: 5, sm: 8 },
            pb: 4.5,
            textAlign: "center",
          }}
        >
          <Typography id="lp-examples-heading" variant="h2" sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.035em", fontSize: "clamp(30px, 4vw, 44px)" }}>
            Job Winning Resume Examples for {year}
          </Typography>
          <Typography sx={{ mt: 1.75, mx: "auto", maxWidth: 560, color: "rgba(255,255,255,0.9)" }}>
            {TOTAL_RESUME_EXAMPLES}+ résumé examples across {RESUME_CATEGORIES.length} careers, built from the skills employers ask for.
          </Typography>
          <Button
            component={Link}
            href="/resume-examples/"
            variant="contained"
            sx={{ mt: 2.75, bgcolor: "#f5c400", color: "#1c1917", "&:hover": { bgcolor: "#ffd21a" } }}
          >
            All resume examples
          </Button>

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 3.5, mt: 3.25 }}>
            <Typography component="span" sx={{ color: "#fff", fontWeight: 700, borderBottom: "2px solid #fff", pb: 1 }}>
              Resumes
            </Typography>
            <Button component={Link} href="/cover-letter/" sx={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, minWidth: 0 }}>
              Cover Letters
            </Button>
          </Box>

          <Paper elevation={3} sx={{ mt: 2.25, borderRadius: "24px", px: { xs: 1.5, sm: 2.75 }, py: 3.25 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1.25 }}>
              {RESUME_CATEGORIES.map(({ name, anchor, icon: Icon }) => (
                <Chip
                  key={anchor}
                  component={Link}
                  href={`/resume-examples/#${anchor}`}
                  clickable
                  icon={<Icon size={16} aria-hidden />}
                  label={name}
                  variant="outlined"
                  sx={{
                    borderColor: "#d7dbf8",
                    color: "#4f46e5",
                    bgcolor: "#fff",
                    fontWeight: 600,
                    "& .MuiChip-icon": { color: "inherit", ml: 1 },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </MuiThemeRegistry>
  );
}
