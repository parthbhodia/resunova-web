"use client";
/**
 * Template Builder top bar.
 *
 * Replaces a single flex row that held six controls at every width. At 390px
 * that row wrapped inside a locked `height: 52`, and the wrapped rows were
 * cropped by an ancestor's `overflow: hidden` — so "Download PDF", the reason
 * the screen exists, was not on screen at all. No scrollbar, no error.
 *
 * Two rules encoded here:
 *   1. One primary action stays visible at every width. Everything else
 *      collapses into the overflow menu. The primary is never what collapses.
 *   2. The bar may grow (`minHeight`), and the title may shrink (`minWidth: 0`
 *      on the flex child) rather than pushing its siblings out of the box.
 */
import { useState, type ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";

export interface TopBarAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

interface Props {
  atsScore: number | null;
  atsColor?: string;
  onOpenReview: () => void;
  onLoadExample: () => void;
  onImport: () => void;
  onSave: () => void;
  onDownload: () => void;
  importing: boolean;
  saveBusy: boolean;
  saveFlash: boolean;
  savedBuilderId: string | null;
  signedIn: boolean | null;
  isGenerating: boolean;
  error?: string | null;
}

export default function TemplateBuilderTopBar({
  atsScore, atsColor, onOpenReview, onLoadExample, onImport, onSave, onDownload,
  importing, saveBusy, saveFlash, savedBuilderId, signedIn, isGenerating, error,
}: Props) {
  const theme = useTheme();
  // TWO questions, not one — this is dimension 15 applied to the bar itself.
  //
  // `isPhone` (<640) decides label density: "PDF" not "Download PDF", no Free
  // chip. `collapseActions` (<1024) decides whether the three secondary
  // actions render inline at all.
  //
  // They are different widths because they answer different questions, and
  // conflating them was a measured bug, not a hypothetical: with the collapse
  // tied to 640, a 768px tablet still rendered all four actions and pushed
  // Download PDF to x=625..770 in a 768px viewport — the exact failure this
  // component exists to fix, moved to a width nobody was looking at.
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const collapseActions = useMediaQuery(theme.breakpoints.down("md"));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const secondary: TopBarAction[] = [
    {
      key: "example",
      label: "Load example",
      icon: <RestartAltIcon fontSize="small" />,
      onClick: onLoadExample,
      tooltip: "Restore the example résumé",
    },
    {
      key: "import",
      label: importing ? "Importing…" : "Import résumé",
      icon: <CloudUploadIcon fontSize="small" />,
      onClick: onImport,
      disabled: importing,
      tooltip: "Import an existing PDF or Word résumé",
    },
    {
      key: "save",
      label: saveBusy ? "Saving…" : saveFlash ? "Saved" : savedBuilderId ? "Update in Hub" : "Save to Hub",
      icon: <SaveIcon fontSize="small" />,
      onClick: onSave,
      disabled: saveBusy || signedIn === false,
      tooltip: signedIn === false ? "Sign in to save to Resume Hub" : "Save a cloud copy to Resume Hub",
    },
  ];

  return (
    <AppBar position="static" sx={{ flexShrink: 0 }}>
      <Toolbar
        variant="dense"
        sx={{
          // minHeight, never a fixed height: a row that is allowed to wrap
          // must be allowed to grow, or wrapping just hides the overflow.
          minHeight: 56,
          gap: 1,
          px: { xs: 1.5, sm: 2.5 },
          py: 0.75,
        }}
      >
        {/* minWidth: 0 lets the title truncate instead of shoving the actions
            off the edge. Flex items refuse to shrink below their content
            without it — this is why the old header wrapped to two lines. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{ fontWeight: 700, letterSpacing: -0.3, minWidth: 0 }}
          >
            Template Builder
          </Typography>
          {!isPhone && <Chip label="Free" size="small" variant="outlined" />}
          <Tooltip title={atsScore != null ? "Open ATS & job-match review" : "Score your résumé against a job"}>
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
              label={atsScore != null ? `ATS ${atsScore}` : "Check ATS"}
              size="small"
              variant="outlined"
              onClick={onOpenReview}
              sx={{
                flexShrink: 0,
                // Interactive (onClick), so it takes the same 44px tap floor the
                // theme gives Button/IconButton. MuiChip has no such default.
                height: 44,
                ...(atsColor ? { color: atsColor, borderColor: atsColor } : null),
              }}
            />
          </Tooltip>
        </Box>

        {error ? (
          <Typography variant="caption" color="error" noWrap sx={{ maxWidth: 180 }}>
            {error}
          </Typography>
        ) : null}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
          {/* Secondary actions render inline only where there is room for
              them. Below the phone breakpoint they move into the menu. */}
          {!collapseActions && secondary.map((a) => (
            <Tooltip key={a.key} title={a.tooltip ?? ""}>
              <span>
                <Button
                  variant="text"
                  color="inherit"
                  size="small"
                  startIcon={a.icon}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {a.label}
                </Button>
              </span>
            </Tooltip>
          ))}

          <Button
            variant="contained"
            onClick={onDownload}
            disabled={isGenerating}
            startIcon={isGenerating
              ? <CircularProgress size={16} color="inherit" />
              : <DownloadIcon />}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {isGenerating ? "Generating…" : isPhone ? "PDF" : "Download PDF"}
          </Button>

          {collapseActions && (
            <>
              <IconButton
                aria-label="More actions"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                color="inherit"
                edge="end"
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {secondary.map((a) => (
                  <MenuItem
                    key={a.key}
                    disabled={a.disabled}
                    onClick={() => { setMenuAnchor(null); a.onClick(); }}
                  >
                    <ListItemIcon>{a.icon}</ListItemIcon>
                    {a.label}
                  </MenuItem>
                ))}
                <Divider />
                <MenuItem disabled sx={{ opacity: 0.7 }}>Free plan</MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
