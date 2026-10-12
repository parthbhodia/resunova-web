"use client";

/**
 * In-page headers for the tailor jobs that are open.
 * Switching a header stays on this page. History holds anything past the cap.
 */

import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { scoreColor } from "@/components/ratings/scoreColor";
import { MAX_OPEN_TAILOR_JOBS, tailorJobLabel } from "@/lib/tailorJobTarget";
import { useTailorWorkspaceStore } from "@/store/tailorWorkspaceStore";

type Props = {
  onFocus: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
};

export default function TailorJobTabs({ onFocus, onAdd, onClose }: Props) {
  const targets = useTailorWorkspaceStore((s) => s.targets);
  const activeId = useTailorWorkspaceStore((s) => s.activeId);
  const atCap = targets.length >= MAX_OPEN_TAILOR_JOBS;
  const canClose = targets.length > 1;

  return (
    <MuiThemeRegistry>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          marginBottom: 16,
          borderBottom: "1px solid var(--border)",
          minWidth: 0,
        }}
      >
        <Tabs
          value={targets.some((job) => job.id === activeId) ? activeId : false}
          onChange={(_, id: string) => onFocus(id)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Open jobs"
          sx={{ minHeight: 48, flex: 1, minWidth: 0 }}
        >
          {targets.map((job) => {
            const label = tailorJobLabel(job.work.company, job.work.role);
            const score = job.score;
            return (
              <Tab
                key={job.id}
                value={job.id}
                aria-label={label}
                label={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 200 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                    {score != null && (
                      <span style={{ fontWeight: 800, color: scoreColor(score), flexShrink: 0 }}>
                        {score}
                      </span>
                    )}
                  </span>
                }
              />
            );
          })}
        </Tabs>
        <IconButton
          aria-label="Close this job"
          onClick={() => onClose(activeId)}
          disabled={!canClose}
          title={canClose ? "Close this job" : "This is the only open job"}
          sx={{ mb: 0.5, flexShrink: 0 }}
        >
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>×</span>
        </IconButton>
        <IconButton
          aria-label="Add a job"
          onClick={onAdd}
          disabled={atCap}
          title={atCap ? "Five jobs are open. Close one to add another." : "Add a job"}
          sx={{ mb: 0.5, flexShrink: 0 }}
        >
          <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>+</span>
        </IconButton>
      </div>
    </MuiThemeRegistry>
  );
}
