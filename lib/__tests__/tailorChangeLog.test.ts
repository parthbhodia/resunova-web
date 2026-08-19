import { describe, expect, it } from "vitest";
import { addedWords, deriveResumeChanges, markAddedTokens } from "@/lib/tailorChangeLog";
import type { QueueItem } from "@/lib/tailorWorkQueue";

const item = (name: string, status: QueueItem["status"] = "applied"): QueueItem => ({
  id: `keyword:${name.toLowerCase()}`,
  name,
  kind: "keyword",
  status,
  detail: "",
});

const BULLETS = [
  { originalBullet: "Built and deployed backend services in Python." },
  { originalBullet: "Led migration of the billing service." },
];

describe("the change log is a receipt for what shipped", () => {
  it("lists an applied fix with its before and after", () => {
    const changes = deriveResumeChanges(
      [item("Kubernetes")],
      [{ label: "Kubernetes", appliedText: "Built and deployed backend services in Python on Kubernetes." }],
      { 0: "Built and deployed backend services in Python on Kubernetes." },
      BULLETS,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].bulletIndex).toBe(0);
    expect(changes[0].original).toBe("Built and deployed backend services in Python.");
    expect(changes[0].applied).toContain("Kubernetes");
    expect(changes[0].requirements).toEqual(["Kubernetes"]);
  });

  it("shows nothing before any fix is applied", () => {
    expect(deriveResumeChanges([item("Kubernetes", "queued")], [], {}, BULLETS)).toEqual([]);
  });

  it("ignores a queued row even when an override exists elsewhere", () => {
    // The row is not applied; its requirement must not be credited to a change
    // some other fix made.
    const changes = deriveResumeChanges(
      [item("Terraform", "queued")],
      [],
      { 1: "Led migration of the billing service with Terraform." },
      BULLETS,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].requirements).toEqual([]); // edited, but not on Terraform's behalf
  });
});

describe("one bullet, many requirements", () => {
  // THE TRAP. applyGapFixes MERGES a second suggestion into a bullet a first
  // one already edited. A per-requirement undo would therefore silently drop
  // the other requirement's work, so the change log groups by bullet and names
  // everything riding on it.
  const ACTIONS = [
    { label: "Kubernetes", appliedText: "Ran services on Kubernetes and Terraform." },
    { label: "Terraform", appliedText: "Ran services on Kubernetes and Terraform." },
  ];
  const OVERRIDES = { 0: "Ran services on Kubernetes and Terraform." };

  it("renders one row, not two", () => {
    const changes = deriveResumeChanges(
      [item("Kubernetes"), item("Terraform")],
      ACTIONS,
      OVERRIDES,
      BULLETS,
    );
    expect(changes).toHaveLength(1);
  });

  it("names every requirement the row would undo", () => {
    const changes = deriveResumeChanges(
      [item("Kubernetes"), item("Terraform")],
      ACTIONS,
      OVERRIDES,
      BULLETS,
    );
    // Without this the confirm copy cannot warn that undo costs both, which is
    // the whole reason the grouping exists.
    expect(changes[0].requirements).toEqual(["Kubernetes", "Terraform"]);
  });
});

describe("an edit with no queue row is still an edit", () => {
  it("appears in the log, naming no requirement", () => {
    // A hand edit or a bulk pass whose label stopped matching. Omitting it
    // would make the receipt quietly incomplete — the exact failure the panel
    // exists to fix.
    const changes = deriveResumeChanges([], [], { 1: "Led the billing migration end to end." }, BULLETS);
    expect(changes).toHaveLength(1);
    expect(changes[0].requirements).toEqual([]);
  });

  it("does not log an override identical to the original", () => {
    const changes = deriveResumeChanges([], [], { 1: BULLETS[1].originalBullet }, BULLETS);
    expect(changes).toEqual([]);
  });

  it("orders rows the way the résumé reads", () => {
    const changes = deriveResumeChanges(
      [],
      [],
      { 1: "Led the billing migration end to end.", 0: "Built services in Go." },
      BULLETS,
    );
    expect(changes.map((c) => c.bulletIndex)).toEqual([0, 1]);
  });
});

describe("a Skills-section add is a change too", () => {
  // The shipped derive resolved every applied row against the bullet
  // overrides, so an Add-to-Skills — which moves no bullet — never appeared,
  // while the panel's header promised "every edit in the file you download".
  const SKILLS_ACTION = {
    label: "Terraform",
    appliedText: "Terraform",
    via: "skills" as const,
  };

  it("derives a skill row from a via-marked action", () => {
    const changes = deriveResumeChanges([item("Terraform")], [SKILLS_ACTION], {}, BULLETS);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      kind: "skill",
      applied: "Terraform",
      requirements: ["Terraform"],
      bulletIndex: -1,
    });
  });

  it("never also claims a bullet for it", () => {
    // A bullet elsewhere may mention the term; a skills add must not be
    // credited to that bullet, or its undo would rewrite a line the add
    // never touched.
    const changes = deriveResumeChanges(
      [item("Python")],
      [{ label: "Python", appliedText: "Python", via: "skills" as const }],
      { 0: "Built and deployed backend services in Python." },
      BULLETS,
    );
    expect(changes.filter((c) => c.kind === "skill")).toHaveLength(1);
    expect(changes.some((c) => c.kind === "fix")).toBe(false);
  });

  it("leaves an unmarked legacy action invisible, exactly as before", () => {
    // Restored sessions predate the `via` marker; their skills adds degrade to
    // the old behaviour (absent) rather than being guessed at from shape.
    const changes = deriveResumeChanges(
      [item("Terraform")],
      [{ label: "Terraform", appliedText: "Terraform" }],
      {},
      BULLETS,
    );
    expect(changes).toEqual([]);
  });

  it("dedupes two applied rows that added the same term", () => {
    const changes = deriveResumeChanges(
      [item("Terraform"), { ...item("Terraform"), id: "qualification:terraform" }],
      [SKILLS_ACTION],
      {},
      BULLETS,
    );
    expect(changes).toHaveLength(1);
  });

  it("orders fixes, then skills adds, then the user's own edits", () => {
    const changes = deriveResumeChanges(
      [item("Kubernetes"), item("Terraform")],
      [
        { label: "Kubernetes", appliedText: "Built and deployed backend services in Python on Kubernetes." },
        SKILLS_ACTION,
      ],
      {
        0: "Built and deployed backend services in Python on Kubernetes.",
        1: "Led the billing migration end to end.",
      },
      BULLETS,
    );
    expect(changes.map((c) => c.kind)).toEqual(["fix", "skill", "edit"]);
  });
});

describe("markAddedTokens", () => {
  it("marks exactly the words addedWords names", () => {
    // The chips and the in-place highlights fold tokens the same way, so the
    // two renderings of "what is new" can never disagree.
    const original = "Built services in Python.";
    const applied = "Built services in Python and Go.";
    const marked = markAddedTokens(original, applied)
      .filter((t) => t.added)
      .map((t) => t.text.replace(/[^\w)%]+$/g, ""));
    expect(marked).toEqual(addedWords(original, applied));
  });

  it("keeps every token of the applied text, in order", () => {
    const tokens = markAddedTokens("A b.", "A b c.").map((t) => t.text);
    expect(tokens).toEqual(["A", "b", "c."]);
  });
});

describe("addedWords", () => {
  it("names only what is new", () => {
    expect(addedWords("Built services in Python.", "Built services in Python and Go."))
      .toEqual(["and", "Go"]);
  });

  it("is insensitive to where a word moved", () => {
    // A rewrite reorders as much as it adds; flagging moved words as new would
    // make the diff useless.
    expect(addedWords("Python and Go services", "Services in Go and Python")).toEqual(["in"]);
  });

  it("returns nothing when the text is unchanged", () => {
    expect(addedWords("Same line.", "Same line.")).toEqual([]);
  });
});
