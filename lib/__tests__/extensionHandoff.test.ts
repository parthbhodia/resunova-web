import { beforeEach, describe, expect, it } from "vitest";
import {
  EXTENSION_JOB_PARAM,
  MAX_HANDOFF_JD_CHARS,
  MAX_HANDOFF_LABEL_CHARS,
  consumeExtensionJobHandoff,
  decodeJobHandoff,
  encodeJobHandoff,
} from "../extensionHandoff";
import { TAILOR_PREFILL_COMPANY, TAILOR_PREFILL_JD, TAILOR_PREFILL_ROLE } from "../tailorPrefill";

const JD = "We are hiring a senior engineer.\n\nRequirements\n- 5+ years of Python\n- Kubernetes";

function toB64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("decodeJobHandoff", () => {
  it("round-trips a posting, including non-ASCII text and newlines", () => {
    const hash = "#" + encodeJobHandoff({ jd: JD + "\nNaïve café 日本語 🙂", company: "Acme", role: "Engineer" });
    expect(decodeJobHandoff(hash)).toEqual({
      jd: JD + "\nNaïve café 日本語 🙂",
      company: "Acme",
      role: "Engineer",
    });
  });

  it("finds the parameter among others in the fragment", () => {
    const hash = "#a=1&" + encodeJobHandoff({ jd: JD }) + "&b=2";
    expect(decodeJobHandoff(hash)?.jd).toBe(JD);
  });

  it("returns null when there is no posting", () => {
    expect(decodeJobHandoff("")).toBeNull();
    expect(decodeJobHandoff("#")).toBeNull();
    expect(decodeJobHandoff("#section-2")).toBeNull();
    expect(decodeJobHandoff("#other=" + toB64Url('{"jd":"x"}'))).toBeNull();
  });

  it("drops a payload that is not valid base64url, JSON or an object", () => {
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=not base64!`)).toBeNull();
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url("{not json")}`)).toBeNull();
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url('"just a string"')}`)).toBeNull();
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url("[1,2]")}`)).toBeNull();
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url("null")}`)).toBeNull();
  });

  it("drops bytes that are not valid UTF-8 instead of repairing them", () => {
    // 0xff is never valid in UTF-8.
    const bad = btoa(String.fromCharCode(0x7b, 0xff, 0x7d)).replace(/=+$/, "");
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${bad}`)).toBeNull();
  });

  it("drops a payload whose posting is missing, blank or not a string", () => {
    for (const body of ['{"company":"Acme"}', '{"jd":"   "}', '{"jd":42}', '{"jd":["a"]}', '{"jd":null}']) {
      expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url(body)}`)).toBeNull();
    }
  });

  it("treats a non-string company or role as empty, not as the posting's failure", () => {
    const out = decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${toB64Url(JSON.stringify({ jd: JD, company: 7, role: { x: 1 } }))}`);
    expect(out).toEqual({ jd: JD, company: "", role: "" });
  });

  it("caps the posting and the labels", () => {
    const out = decodeJobHandoff(
      "#" + encodeJobHandoff({ jd: "a".repeat(MAX_HANDOFF_JD_CHARS + 500), company: "c".repeat(900), role: "r".repeat(900) }),
    );
    expect(out?.jd.length).toBe(MAX_HANDOFF_JD_CHARS);
    expect(out?.company.length).toBe(MAX_HANDOFF_LABEL_CHARS);
    expect(out?.role.length).toBe(MAX_HANDOFF_LABEL_CHARS);
  });

  it("refuses an oversized fragment without trying to decode it", () => {
    expect(decodeJobHandoff(`#${EXTENSION_JOB_PARAM}=${"A".repeat(95_000)}`)).toBeNull();
  });

  it("strips control characters but keeps newlines, and collapses labels to one line", () => {
    const out = decodeJobHandoff(
      "#" + encodeJobHandoff({ jd: "Line one\u0000\u0007\nLine two", company: "Ac\nme\u0000 Inc", role: "Senior\n\nEngineer" }),
    );
    expect(out?.jd).toBe("Line one \nLine two");
    expect(out?.jd).not.toMatch(/[\u0000-\u0008]/);
    expect(out?.company).toBe("Ac me Inc");
    expect(out?.role).toBe("Senior Engineer");
  });
});

describe("consumeExtensionJobHandoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/tailor-2/?intent=job");
  });

  it("stores the posting under the Tailor prefill keys and clears the fragment", () => {
    window.history.replaceState(null, "", "/tailor-2/?intent=job#" + encodeJobHandoff({ jd: JD, company: "Acme", role: "Engineer" }));
    expect(consumeExtensionJobHandoff()).toBe(true);
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBe(JD);
    expect(sessionStorage.getItem(TAILOR_PREFILL_COMPANY)).toBe("Acme");
    expect(sessionStorage.getItem(TAILOR_PREFILL_ROLE)).toBe("Engineer");
    expect(window.location.hash).toBe("");
    // The query the builder keys on survives.
    expect(window.location.pathname + window.location.search).toBe("/tailor-2/?intent=job");
  });

  it("does not leave the previous job's company or role on a new posting that has none", () => {
    sessionStorage.setItem(TAILOR_PREFILL_COMPANY, "Old Co");
    sessionStorage.setItem(TAILOR_PREFILL_ROLE, "Old Role");
    window.history.replaceState(null, "", "/tailor-2/?intent=job#" + encodeJobHandoff({ jd: JD }));
    expect(consumeExtensionJobHandoff()).toBe(true);
    expect(sessionStorage.getItem(TAILOR_PREFILL_COMPANY)).toBeNull();
    expect(sessionStorage.getItem(TAILOR_PREFILL_ROLE)).toBeNull();
  });

  it("clears an unusable fragment too, and stores nothing", () => {
    sessionStorage.setItem(TAILOR_PREFILL_JD, "earlier posting");
    window.history.replaceState(null, "", `/tailor-2/?intent=job#${EXTENSION_JOB_PARAM}=%%%garbage`);
    expect(consumeExtensionJobHandoff()).toBe(false);
    expect(window.location.hash).toBe("");
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBe("earlier posting");
  });

  it("leaves an unrelated fragment alone", () => {
    window.history.replaceState(null, "", "/tailor-2/?intent=job#results");
    expect(consumeExtensionJobHandoff()).toBe(false);
    expect(window.location.hash).toBe("#results");
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBeNull();
  });

  it("is a no-op when there is no fragment", () => {
    expect(consumeExtensionJobHandoff()).toBe(false);
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBeNull();
  });

  it("consumes once: a second call finds nothing", () => {
    window.history.replaceState(null, "", "/tailor-2/?intent=job#" + encodeJobHandoff({ jd: JD }));
    expect(consumeExtensionJobHandoff()).toBe(true);
    sessionStorage.clear();
    expect(consumeExtensionJobHandoff()).toBe(false);
    expect(sessionStorage.getItem(TAILOR_PREFILL_JD)).toBeNull();
  });
});
