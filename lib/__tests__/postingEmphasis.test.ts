import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import {
  EMPHASIS_MIN,
  countPostingMentions,
  emphasisWhy,
  postingFrequency,
  stampPostingEmphasis,
} from "@/lib/postingEmphasis";
import { findTermBulletIndex } from "@/lib/resumeBulletMatch";
import { IGNORED_DETAIL, type QueueItem } from "@/lib/tailorWorkQueue";
import { RequirementChecklist, TailorWorkQueue } from "@/components/tailor/TailorWorkQueue";

/**
 * The v8 evidence pass (founder-approved mockup): ×N-in-posting frequency as
 * the per-keyword why, See-it on rows whose term the document already carries,
 * and the checklist strip drawing the match block's own count.
 *
 * The honesty claims pinned here:
 *  - counting is token-boundary ([0-9a-z+#.]), so "Go" never counts inside
 *    "Google" and "C++" is countable at all — the api's own matching lesson;
 *  - frequency is the MAX over spellings, never the sum, so canonical+alias
 *    overlapping one occurrence cannot double-count;
 *  - nothing shows below ×2 — repetition is the signal being borrowed;
 *  - the See-it link renders ONLY where a target resolves (a link that
 *    scrolls nowhere is a dead click), and never on applied receipts, which
 *    carry their own See-it action;
 *  - the checklist never computes its own count — it draws the caller's.
 */

describe("countPostingMentions", () => {
  it("counts on token boundaries, not substrings", () => {
    expect(countPostingMentions("Go", "We use Go at Google. Go is great.")).toBe(2);
    expect(countPostingMentions("Go", "Google Googling Golang")).toBe(0);
  });

  it("counts terms \\b cannot see", () => {
    expect(countPostingMentions("C++", "C++ services. Modern C++ everywhere.")).toBe(2);
  });

  it("is case-folded and multi-word", () => {
    expect(
      countPostingMentions("machine learning", "Machine Learning models; machine learning ops."),
    ).toBe(2);
  });

  it("counts adjacent repeats", () => {
    expect(countPostingMentions("go", "go go go")).toBe(3);
  });

  it("a sentence-final period does not hide the last word", () => {
    // The dot stays in the token class for Node.js — which glued "Terraform."
    // into one unmatchable token until token-final dots were stripped. Caught
    // by the override test; pinned here by name.
    expect(countPostingMentions("Terraform", "We use Terraform. We love Terraform.")).toBe(2);
    expect(countPostingMentions("Node.js", "Node.js services in Node.js land")).toBe(2);
  });
});

describe("postingFrequency", () => {
  it("takes the max over spellings, never the sum", () => {
    // "CI/CD pipelines" and its alias "CI/CD" both hit the same two
    // occurrences; a sum would report 4 for a posting that says it twice.
    const jd = "You will own CI/CD pipelines. Our CI/CD pipelines matter.";
    expect(postingFrequency("CI/CD pipelines", ["CI/CD"], jd)).toBe(2);
  });

  it("lets a better-hit alias carry the count", () => {
    const jd = "K8s here. K8s there. K8s everywhere.";
    expect(postingFrequency("Kubernetes", ["K8s"], jd)).toBe(3);
  });
});

const row = (over: Partial<QueueItem> & { id: string; name: string }): QueueItem => ({
  kind: "keyword",
  status: "queued",
  detail: "Adding this counts toward your match score.",
  ...over,
});

const CONCEPTS = [
  { canonical: "Terraform", aliases: [] },
  { canonical: "Snowflake", aliases: [] },
  { canonical: "Kubernetes", aliases: ["K8s"] },
];

const JD =
  "Terraform daily. Terraform modules. Terraform states. We also run Kubernetes; K8s at scale, K8s on-prem. Snowflake once.";

describe("stampPostingEmphasis", () => {
  it("stamps freq at ×2+ and the why LEADS the open row's detail", () => {
    const [terraform] = stampPostingEmphasis(
      [row({ id: "k:terraform", name: "Terraform" })],
      CONCEPTS,
      JD,
    );
    expect(terraform.freq).toBe(3);
    expect(terraform.detail.startsWith(emphasisWhy(3))).toBe(true);
    // The benefit copy survives after the why.
    expect(terraform.detail).toContain("counts toward your match score");
  });

  it("a ×1 term gets no chip and an untouched detail", () => {
    const [snowflake] = stampPostingEmphasis(
      [row({ id: "k:snowflake", name: "Snowflake" })],
      CONCEPTS,
      JD,
    );
    expect(snowflake.freq).toBeUndefined();
    expect(snowflake.detail).toBe("Adding this counts toward your match score.");
    expect(EMPHASIS_MIN).toBe(2);
  });

  it("orders keyword rows high-frequency first, ties keeping their order", () => {
    const rows = [
      row({ id: "k:snowflake", name: "Snowflake" }),
      row({ id: "k:terraform", name: "Terraform" }),
      row({ id: "k:kubernetes", name: "Kubernetes" }),
    ];
    const out = stampPostingEmphasis(rows, CONCEPTS, JD);
    // Terraform ×3, Kubernetes ×2 (K8s alias ×2... K8s appears twice; max(1,2)=2), Snowflake ×1.
    expect(out.map((r) => r.name)).toEqual(["Terraform", "Kubernetes", "Snowflake"]);
  });

  it("moves only keyword rows; every other row keeps its exact slot", () => {
    const rows = [
      row({ id: "q:degree", name: "Bachelor's degree", kind: "qualification", detail: "d" }),
      row({ id: "k:snowflake", name: "Snowflake" }),
      row({ id: "c:fintech", name: "fintech", kind: "contextual", detail: "d" }),
      row({ id: "k:terraform", name: "Terraform" }),
    ];
    const out = stampPostingEmphasis(rows, CONCEPTS, JD);
    expect(out.map((r) => r.id)).toEqual(["q:degree", "k:terraform", "c:fintech", "k:snowflake"]);
  });

  it("never rewrites a resolved row's story", () => {
    const applied = row({ id: "k:terraform", name: "Terraform", status: "applied", detail: "Fix applied." });
    const ignored = row({ id: "k:kubernetes", name: "Kubernetes", status: "ignored", detail: IGNORED_DETAIL });
    const out = stampPostingEmphasis([applied, ignored], CONCEPTS, JD);
    expect(out[0].detail).toBe("Fix applied.");
    expect(out[1].detail).toBe(IGNORED_DETAIL);
    // The measurement itself still rides — it is about the posting, not the row.
    expect(out[0].freq).toBe(3);
  });

  it("is the identity without a posting or concepts", () => {
    const rows = [row({ id: "k:terraform", name: "Terraform" })];
    expect(stampPostingEmphasis(rows, [], JD)).toEqual(rows);
    expect(stampPostingEmphasis(rows, CONCEPTS, " ")).toEqual(rows);
  });
});

describe("findTermBulletIndex", () => {
  const bullets = [
    { originalBullet: "Shipped internal dashboards for analysts." },
    { originalBullet: "Managed Terraform stacks across three environments." },
  ];

  it("finds the term on token boundaries, overrides winning", () => {
    expect(findTermBulletIndex("Terraform", bullets, {})).toBe(1);
    expect(findTermBulletIndex("Go", [{ originalBullet: "Google Cloud work." }], {})).toBeNull();
    expect(
      findTermBulletIndex("Terraform", [{ originalBullet: "Dashboards." }], { 0: "Rebuilt with Terraform." }),
    ).toBe(0);
  });

  it("returns null when nothing carries it", () => {
    expect(findTermBulletIndex("Rust", bullets, {})).toBeNull();
  });
});

describe("RequirementChecklist", () => {
  it("draws the caller's count and caps the dots", () => {
    render(React.createElement(RequirementChecklist, { counted: 9, total: 24, working: true }));
    expect(screen.getByText(/9 of 24/)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-dot='done']")).toHaveLength(9);
    expect(document.querySelectorAll("[data-dot='working']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-dot]")).toHaveLength(24);
  });

  it("past 48 requirements the count text carries the fact alone", () => {
    render(React.createElement(RequirementChecklist, { counted: 10, total: 200 }));
    expect(screen.getByText(/10 of 200/)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-dot]")).toHaveLength(0);
  });

  it("renders nothing for an impossible count", () => {
    const { container } = render(React.createElement(RequirementChecklist, { counted: 30, total: 24 }));
    expect(container.innerHTML).toBe("");
  });
});

describe("See it in your résumé", () => {
  const items: QueueItem[] = [
    row({ id: "k:terraform", name: "Terraform" }),
    row({ id: "k:rust", name: "Rust" }),
    row({ id: "k:python", name: "Python", status: "applied", detail: "Fix applied." }),
  ];

  function mount(canSee: (it: QueueItem) => boolean, onSee = vi.fn()) {
    render(
      React.createElement(TailorWorkQueue, {
        items,
        onFixAll: vi.fn(),
        fixAllBusy: false,
        onSeeInResume: onSee,
        canSeeInResume: canSee,
      }),
    );
    return onSee;
  }

  it("renders only where the resolver found a target, and clicking scrolls that row", () => {
    const onSee = mount((it) => it.name === "Terraform" || it.name === "Python");
    const links = screen.getAllByRole("button", { name: /see it in your résumé/i });
    // Terraform resolves → link. Rust does not → none (a dead click is worse
    // than no link). Python resolves but is an applied receipt, which carries
    // its own See-it action — no second affordance.
    expect(links).toHaveLength(1);
    fireEvent.click(links[0]);
    expect(onSee).toHaveBeenCalledTimes(1);
    expect(onSee.mock.calls[0][0].name).toBe("Terraform");
  });

  it("renders nothing without a resolver", () => {
    render(
      React.createElement(TailorWorkQueue, {
        items,
        onFixAll: vi.fn(),
        fixAllBusy: false,
        onSeeInResume: vi.fn(),
      }),
    );
    expect(screen.queryByRole("button", { name: /see it in your résumé/i })).toBeNull();
  });
});
