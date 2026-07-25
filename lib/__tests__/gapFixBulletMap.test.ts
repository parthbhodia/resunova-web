import { describe, expect, it } from "vitest";
import {
  gapFixTargetBulletMap,
  gapFixTargetBulletIndices,
  type LiveBulletItem,
} from "@/lib/resumeBulletMatch";

const bullets: LiveBulletItem[] = [
  { originalBullet: "Built and maintained scalable Vue.js frontends for compliance platforms.", score: 60, issues: [], improvedBullet: "" },
  { originalBullet: "Engineered a secure JWT-based authentication system with AWS Amplify and Cognito.", score: 55, issues: [], improvedBullet: "" },
  { originalBullet: "Wrote comprehensive unit and integration tests in Python and TypeScript.", score: 70, issues: [], improvedBullet: "" },
];

const profile = bullets.map((b) => `• ${b.originalBullet}`).join("\n");

describe("gapFixTargetBulletMap", () => {
  it("maps each suggestion id to the bullet it edits", () => {
    const map = gapFixTargetBulletMap(
      [
        { id: "a", original: bullets[0].originalBullet },
        { id: "b", original: bullets[2].originalBullet },
      ],
      bullets,
      profile,
    );
    expect(map.get("a")).toBe(0);
    expect(map.get("b")).toBe(2);
  });

  it("keeps both ids when two suggestions target the SAME bullet", () => {
    // The case that makes index -> id a non-function, and the reason selection
    // is modelled as an event rather than two synced fields.
    const map = gapFixTargetBulletMap(
      [
        { id: "a", original: bullets[1].originalBullet },
        { id: "b", original: bullets[1].originalBullet },
      ],
      bullets,
      profile,
    );
    expect(map.get("a")).toBe(1);
    expect(map.get("b")).toBe(1);
    expect(map.size).toBe(2);
  });

  it("OMITS a suggestion whose original matches no bullet", () => {
    // Apply registers a brand-new bullet for these, so storing -1 would make
    // the card claim to be editing a line that does not exist.
    const map = gapFixTargetBulletMap(
      [{ id: "ghost", original: "Something never present in this résumé at all." }],
      bullets,
      profile,
    );
    expect(map.has("ghost")).toBe(false);
    expect(map.size).toBe(0);
  });

  it("tolerates empty input", () => {
    expect(gapFixTargetBulletMap([], bullets, profile).size).toBe(0);
  });
});

describe("gapFixTargetBulletIndices stays byte-identical", () => {
  // It drives the purple preview tint and had no test before. Order matters:
  // the map preserves insertion order and Set dedupes on first occurrence.
  it("returns the same indices, in the same order, as the map's values", () => {
    const suggestions = [
      { id: "a", original: bullets[2].originalBullet, suggested: "x" },
      { id: "b", original: bullets[0].originalBullet, suggested: "y" },
      { id: "c", original: bullets[2].originalBullet, suggested: "z" },
      { id: "d", original: "no match whatsoever in this document", suggested: "w" },
    ];
    const indices = gapFixTargetBulletIndices(suggestions, bullets, profile);
    const fromMap = [...new Set(gapFixTargetBulletMap(suggestions, bullets, profile).values())];
    expect(indices).toEqual(fromMap);
    expect(indices).toEqual([2, 0]);
  });
});
