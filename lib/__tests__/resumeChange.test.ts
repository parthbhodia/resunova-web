/**
 * "The working résumé changed" reaches every cache that depends on it, and
 * every place that saves a new working résumé says so.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { writeCache } from "@/lib/clientCache";
import { peekJobDetail, type JobDetail } from "@/lib/jobsApi";
import { notifyResumeChanged, resumeEpoch, subscribeResumeChanged } from "@/lib/resumeChange";

/** Source with comments removed, so a docstring that names a call cannot satisfy a pin. */
function code(path: string): string {
  return readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("notifyResumeChanged", () => {
  it("drops every cached job detail, because each one carries the old résumé's score", () => {
    writeCache("job:detail:a", { id: "a" } as JobDetail);
    writeCache("job:detail:b", { id: "b" } as JobDetail);
    expect(peekJobDetail("a")).not.toBeNull();
    notifyResumeChanged();
    expect(peekJobDetail("a")).toBeNull();
    expect(peekJobDetail("b")).toBeNull();
  });

  it("tells every listener once, moves the epoch, and stops after unsubscribe", () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = subscribeResumeChanged(first);
    const offSecond = subscribeResumeChanged(second);
    const before = resumeEpoch();
    notifyResumeChanged();
    expect(resumeEpoch()).not.toBe(before);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    offFirst();
    notifyResumeChanged();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    offSecond();
  });

  it("a listener that throws does not stop the others", () => {
    const after = vi.fn();
    const offBroken = subscribeResumeChanged(() => {
      throw new Error("broken");
    });
    const offAfter = subscribeResumeChanged(after);
    expect(() => notifyResumeChanged()).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    offBroken();
    offAfter();
  });
});

describe("every place that saves a new working résumé says so", () => {
  it("the upload in Jobs, once the scan is saved", () => {
    const src = code("components/JobsFeed.tsx");
    const upload = src.indexOf("await analyzeResumeUpload(file)");
    const notify = src.indexOf("notifyResumeChanged()", upload);
    expect(upload).toBeGreaterThan(-1);
    expect(notify).toBeGreaterThan(upload);
    // Within the same statement block, not some later unrelated call.
    expect(src.slice(upload, notify)).not.toMatch(/\}\s*catch/);
  });

  it("an upload that was read but not saved is an error, not a silent success", () => {
    const src = code("components/JobsFeed.tsx");
    expect(src).toMatch(/if \(json\?\.analysisPersisted === false\) \{\s*throw new Error\(/);
  });

  it("Optimize's 'Use as my résumé', when the server returns the new scan", () => {
    const src = code("components/BoostPanel.tsx");
    expect(src).toMatch(/typeof body\?\.analysisId === "string"\) \{\s*notifyResumeChanged\(\);/);
  });

  it("a scan saved in Analyze, and only once it has an id", () => {
    const src = code("components/AnalyzeResume.tsx");
    const persist = src.slice(src.indexOf("const persistResult = useCallback"));
    expect(persist).toMatch(/if \(newId\) \{\s*notifyResumeChanged\(\);/);
  });

  it("the feed cache and top matches listen", () => {
    expect(code("components/JobsFeed.tsx")).toMatch(/subscribeResumeChanged\(\(\) => \{\s*feedCache = null;/);
    expect(code("lib/useJobTopMatches.ts")).toMatch(/\[enabled, query, refreshKey, refreshNonce, resumeEpoch\]/);
  });
});
