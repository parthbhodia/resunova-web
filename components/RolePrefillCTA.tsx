"use client";

import { useRouter } from "next/navigation";
import { prefillFromRole, prefillFromRoleExample, stashTemplateBuilderExactPrefill } from "@/lib/templateBuilderPrefill";
import type { TBResumeData } from "@/components/TemplateBuilder/types";
import type { RoleResumeData } from "@/lib/roleResumeData";

/**
 * Opens the résumé builder from a role example page.
 *
 * The button carries the example the page RENDERED, so what you clicked on is
 * what you get to edit. Copy lives here rather than on the page because it
 * describes which of the two hand-offs happened, and a sentence that can
 * disagree with the button beside it is how the CTA came to advertise the
 * job-description tailor while pointing at the builder.
 */
export default function RolePrefillCTA({
  role,
  example,
}: {
  role: RoleResumeData;
  example?: TBResumeData | null;
}) {
  const router = useRouter();

  function handleClick() {
    const data = example ? prefillFromRoleExample(example) : prefillFromRole(role);
    stashTemplateBuilderExactPrefill(data);
    router.push("/template-builder");
  }

  return (
    <>
      <p style={{ margin: "0 0 14px", color: "var(--muted)" }}>
        {example
          ? "Opens the example above in the résumé builder with your own name and contact details left blank. Replace the sample experience with yours, pick a template, and download an ATS-clean PDF. Free, no signup."
          : `Opens the résumé builder with the skills most requested in ${role.label.toLowerCase()} postings already lined up. Add your own experience, pick a template, and download an ATS-clean PDF. Free, no signup.`}
      </p>
      <button
        onClick={handleClick}
        style={{
          display: "inline-block",
          padding: "10px 18px",
          borderRadius: 10,
          background: "var(--accent)",
          color: "var(--on-fill)",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        {example ? "Start from this example →" : `Build a ${role.label.toLowerCase()} resume →`}
      </button>
    </>
  );
}
