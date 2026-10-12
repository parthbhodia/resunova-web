"use client";

/**
 * Public-site chrome. The signed-in app already keeps one shell and swaps
 * the view inside it. Marketing pages each drew their own header, which is
 * why a page like referrals could ship with a logo and nothing else.
 * This frame is the header and footer those pages share. The page supplies
 * only its content.
 */

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { LogoFull, LogoMark } from "@/components/BrandLogo";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { useSignInDialog } from "@/components/SignInDialog";
import { barSx, filledButtonSx, navItemSx, outlineButtonSx, pageColumnSx } from "@/components/mui/cssVars";
import { SITE_URL } from "@/lib/brand";
import { goToFreeScan } from "@/lib/anonScan";
import { TAILOR_ROUTE } from "@/lib/tailorRoute";
import { FS, FW } from "@/lib/typography";

const NAV = [
  { label: "Resume Builder", href: TAILOR_ROUTE },
  { label: "Resume Examples", href: "/resume-examples/" },
  { label: "Cover Letter", href: "/?view=cover-letter" },
  { label: "ATS Checker", href: "/?view=analyze" },
  { label: "Blog", href: "/blog/" },
  { label: "Referrals", href: "/refer/" },
] as const;

const FOOTER = [
  ["Blog", "/blog"],
  ["Resume Examples", "/resume-examples"],
  ["Skills for Resume", "/skills-for-resume"],
  ["Cover Letter", "/cover-letter"],
  ["ATS Checker", "/ats-resume-checker"],
  ["Referrals", "/refer/"],
  ["Contact", "/contact"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

function pathIsCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  const target = href.split("?")[0].replace(/\/$/, "") || "/";
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { openSignIn } = useSignInDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("rn-theme", next);
    } catch {
      /* private mode still flips the attribute for this visit */
    }
    setDark(!dark);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <MuiThemeRegistry>
      <Box sx={pageColumnSx}>
        <AppBar position="sticky" sx={barSx}>
          <Toolbar sx={{ gap: 1, maxWidth: 1320, width: "100%", mx: "auto", px: { xs: 2, md: 4 }, minWidth: 0 }}>
            <Link href="/" aria-label="Resunova home" style={{ display: "inline-flex", textDecoration: "none", color: "inherit", flexShrink: 0 }}>
              <LogoFull markSize={28} textColor="var(--text)" />
            </Link>

            <Box
              component="nav"
              aria-label="Primary"
              sx={{
                display: { xs: "none", lg: "flex" },
                alignItems: "center",
                gap: 0.5,
                flex: { lg: 1 },
                minWidth: 0,
                ml: { lg: 2 },
              }}
            >
              {NAV.map((item) => (
                <SiteNavLink key={item.href} href={item.href} label={item.label} current={pathIsCurrent(pathname, item.href)} />
              ))}
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", flexShrink: 0 }}>
              <Button
                color="inherit"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="site-menu"
                onClick={() => setMenuOpen((open) => !open)}
                sx={{ display: { xs: "inline-flex", lg: "none" }, borderRadius: "999px", ...outlineButtonSx }}
              >
                {menuOpen ? "Close" : "Menu"}
              </Button>
              <IconButton
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                onClick={toggleTheme}
                sx={{ "&&": { color: "var(--text)" }, display: { xs: "none", md: "inline-flex" } }}
              >
                {dark ? <SunIcon /> : <MoonIcon />}
              </IconButton>
              <Button
                color="inherit"
                onClick={() => openSignIn()}
                sx={{ display: { xs: "none", md: "inline-flex" }, ...outlineButtonSx }}
              >
                Sign in
              </Button>
              <Button
                variant="contained"
                onClick={() => goToFreeScan()}
                sx={{ display: { xs: "none", md: "inline-flex" }, ...filledButtonSx }}
              >
                Score my résumé
              </Button>
            </Box>
          </Toolbar>

          {menuOpen ? (
            <Box
              id="site-menu"
              component="nav"
              aria-label="Menu"
              sx={{
                display: { lg: "none" },
                px: 2,
                pb: 2,
                borderTop: "1px solid",
                borderColor: "var(--border)",
                bgcolor: "var(--surface)",
              }}
            >
              {NAV.map((item) => (
                <SiteNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  current={pathIsCurrent(pathname, item.href)}
                  onClick={closeMenu}
                  fullWidth
                  idle="text"
                />
              ))}
              <Button color="inherit" fullWidth onClick={toggleTheme} sx={{ justifyContent: "flex-start", color: "var(--text)" }}>
                {dark ? "Light mode" : "Dark mode"}
              </Button>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button color="inherit" fullWidth onClick={() => { closeMenu(); openSignIn(); }} sx={outlineButtonSx}>
                  Sign in
                </Button>
                <Button variant="contained" fullWidth onClick={() => { closeMenu(); goToFreeScan(); }} sx={filledButtonSx}>
                  Score my résumé
                </Button>
              </Box>
            </Box>
          ) : null}
        </AppBar>

        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>

        <Box
          component="footer"
          sx={{
            borderTop: "1px solid",
            borderColor: "var(--border)",
            bgcolor: "var(--surface)",
            px: { xs: 2, md: 5 },
            pt: 5,
            pb: 3,
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 4, flexWrap: "wrap", mb: 3 }}>
              <Box sx={{ maxWidth: 320 }}>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
                  <LogoMark size={24} />
                  <Typography component="span" sx={{ fontSize: FS.title, fontWeight: FW.bold, letterSpacing: "-0.02em", color: "var(--text)" }}>
                    Resunova
                  </Typography>
                </Link>
                <Typography sx={{ mt: 1.25, fontSize: FS.bodyLg, lineHeight: 1.55, color: "var(--muted)" }}>
                  Résumé scoring and tailoring, free for students and job seekers.
                </Typography>
              </Box>
              <Box component="nav" aria-label="Footer" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", maxWidth: 640 }}>
                {FOOTER.map(([label, href]) => (
                  <SiteNavLink key={href} href={href} label={label} current={pathIsCurrent(pathname, href)} />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", pt: 3, borderTop: "1px solid var(--border)" }}>
              <Typography sx={{ fontSize: FS.small, color: "var(--muted)" }}>© 2026 Resunova. All rights reserved.</Typography>
              <Typography component="a" href={SITE_URL} sx={{ fontSize: FS.small, color: "var(--muted)", textDecoration: "none" }}>
                {SITE_URL.replace(/^https:\/\//, "")}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </MuiThemeRegistry>
  );
}

function SiteNavLink({
  href,
  label,
  current,
  onClick,
  fullWidth = false,
  idle = "muted",
}: {
  href: string;
  label: string;
  current: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
  idle?: "muted" | "text";
}) {
  return (
    <Button
      component={Link}
      href={href}
      fullWidth={fullWidth}
      color="inherit"
      size="small"
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      sx={{ ...navItemSx(current, idle), justifyContent: fullWidth ? "flex-start" : undefined }}
    >
      {label}
    </Button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: "var(--text)" }}>
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: "var(--text)" }}>
      <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 000 11 6 6 0 008-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
