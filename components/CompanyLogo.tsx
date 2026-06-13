"use client";

/**
 * CompanyLogo — tries the ordered logo candidates (name-domain, then slug guess)
 * and falls back to a monogram letter when none resolve. Used on job feed cards
 * and the job detail header.
 */
import { useMemo, useState } from "react";
import { companyLogoCandidates } from "@/lib/jobsApi";

export default function CompanyLogo({
  company,
  companyDomain,
  slug,
  size = 48,
  radius = 12,
}: {
  company: string;
  companyDomain: string;
  slug: string;
  size?: number;
  radius?: number;
}) {
  const candidates = useMemo(
    () => companyLogoCandidates(companyDomain || "", slug || ""),
    [companyDomain, slug],
  );
  const [idx, setIdx] = useState(0);
  const exhausted = idx >= candidates.length;
  const letter = (company || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: exhausted ? "#26221f" : "var(--surface2)",
      }}
    >
      {exhausted ? (
        <span style={{ fontSize: size * 0.42, fontWeight: 700, color: "#ee8c5c" }}>{letter}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={candidates[idx]}
          alt={company}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setIdx((i) => i + 1)}
          style={{ objectFit: "contain", width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
