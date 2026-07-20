import { describe, it, expect } from "vitest";
import { buildScanGreeting } from "@/lib/scanGreeting";

describe("buildScanGreeting", () => {
  it("unlimited (UMBC) → success tone, mentions unlimited", () => {
    const g = buildScanGreeting({ enforced: true, unlimited: true });
    expect(g.tone).toBe("success");
    expect(g.message).toMatch(/unlimited/i);
  });

  it("enforced with scans left → success tone, shows N of limit", () => {
    const g = buildScanGreeting({ enforced: true, unlimited: false, limit: 10, used: 3, remaining: 7 });
    expect(g.tone).toBe("success");
    expect(g.message).toMatch(/7 of 10 free résumé scans left today/);
  });

  it("enforced but exhausted → warning tone, mentions reset", () => {
    const g = buildScanGreeting({ enforced: true, unlimited: false, limit: 10, used: 10, remaining: 0 });
    expect(g.tone).toBe("warning");
    expect(g.message).toMatch(/all 10 free scans/);
    expect(g.message).toMatch(/reset at midnight UTC/i);
  });

  it("missing limit falls back to the advertised 10", () => {
    const g = buildScanGreeting({ enforced: true, unlimited: false, remaining: 4 });
    expect(g.message).toMatch(/4 of 10 free résumé scans left today/);
  });

  it("not enforced / null → info fallback advertises 10 a day", () => {
    expect(buildScanGreeting(null).tone).toBe("info");
    expect(buildScanGreeting(null).message).toMatch(/10 free résumé scans every day/);
    expect(
      buildScanGreeting({ enforced: false, unlimited: false }).message,
    ).toMatch(/10 free résumé scans every day/);
  });
});
