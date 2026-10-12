import type { CSSProperties } from "react";
import { FS, FW } from "@/lib/typography";

const countStyle: CSSProperties = {
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 999,
  background: "var(--accent-bg)",
  color: "var(--accent-ink)",
  fontSize: FS.small,
  fontWeight: FW.extrabold,
  display: "inline-grid",
  placeItems: "center",
  lineHeight: 1,
};

/** Number of people this employee has marked Referred, then their name. */
export function ReferrerName({ name, count }: { name: string; count?: number | null }) {
  const shown = typeof count === "number" ? count : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {shown !== null ? (
        <span aria-label={`${shown} referred`} style={countStyle}>{shown}</span>
      ) : null}
      <span>{name}</span>
    </span>
  );
}
