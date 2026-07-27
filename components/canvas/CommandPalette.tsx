"use client";
/**
 * ⌘K command palette.
 *
 * Additive on purpose: it adds a second, faster route to things the UI
 * already exposes, and removes nothing. The builder's own tabs, jump chips
 * and buttons all still work — this is for people who would rather type than
 * hunt, and it costs no permanent screen space, which is the only reason a
 * builder this dense can afford another entry point at all.
 *
 * Commands are supplied by the host surface rather than hard-coded here, so
 * the same palette serves the Template Builder, Analyze, or anything else
 * that wants one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export interface Command {
  id: string;
  label: string;
  /** Short group name shown before the label — "go", "add", "design". */
  group: string;
  icon?: ReactNode;
  /** Extra words to match on that are not in the visible label. */
  keywords?: string;
  run: () => void;
}

/** Opens on ⌘K / Ctrl+K, anywhere in the subtree that renders this. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export default function CommandPalette({
  open, onClose, commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.group} ${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset per opening rather than in an effect on `open`: a stale cursor from
  // the previous session would highlight the wrong row for one frame.
  const handleClose = useCallback(() => { setQuery(""); setCursor(0); onClose(); }, [onClose]);

  const runAt = useCallback((i: number) => {
    const cmd = hits[i];
    if (!cmd) return;
    handleClose();
    cmd.run();
  }, [hits, handleClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % Math.max(1, hits.length)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c - 1 + hits.length) % Math.max(1, hits.length)); }
    if (e.key === "Enter") { e.preventDefault(); runAt(cursor); }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      // Anchored high rather than centred: the list grows downward, and a
      // vertically centred palette jumps as results filter.
      sx={{ "& .MuiDialog-container": { alignItems: "flex-start", pt: "12vh" } }}
      slotProps={{ paper: { sx: { borderRadius: 2, overflow: "hidden" } } }}
    >
      <InputBase
        autoFocus
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
        onKeyDown={onKeyDown}
        placeholder="Type a command or search a section…"
        inputProps={{ "aria-label": "Command palette" }}
        sx={{ px: 2, py: 1.5, fontSize: 15, width: "100%", borderBottom: 1, borderColor: "divider" }}
      />
      <List ref={listRef} dense sx={{ maxHeight: "46vh", overflowY: "auto", p: 0.75 }}>
        {hits.length === 0 && (
          <Box sx={{ p: 2.5, textAlign: "center", color: "text.secondary", fontSize: 13 }}>
            Nothing matches “{query}”
          </Box>
        )}
        {hits.map((c, i) => (
          <ListItemButton
            key={c.id}
            selected={i === cursor}
            onMouseEnter={() => setCursor(i)}
            onClick={() => runAt(i)}
            sx={{ borderRadius: 1, minHeight: 40, gap: 1 }}
          >
            {c.icon ? <ListItemIcon sx={{ minWidth: 30 }}>{c.icon}</ListItemIcon> : null}
            <Typography
              component="span"
              sx={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase",
                color: "text.secondary", minWidth: 46,
              }}
            >
              {c.group}
            </Typography>
            <ListItemText slotProps={{ primary: { sx: { fontSize: 13 } } }} primary={c.label} />
          </ListItemButton>
        ))}
      </List>
    </Dialog>
  );
}
