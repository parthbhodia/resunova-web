"use client";

import { useRouter } from "next/navigation";
import { prefillFromRole, stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";
import type { RoleResumeData } from "@/lib/roleResumeData";

export default function RolePrefillCTA({ role }: { role: RoleResumeData }) {
  const router = useRouter();

  function handleClick() {
    const data = prefillFromRole(role);
    stashTemplateBuilderExactPrefill(data);
    router.push("/template-builder");
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-block",
        padding: "10px 18px",
        borderRadius: 10,
        background: "var(--accent)",
        color: "var(--accent-foreground)",
        fontWeight: 700,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      Build a {role.label.toLowerCase()} resume →
    </button>
  );
}
