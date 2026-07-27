/**
 * Drives the flows that unit tests and tsc cannot reach.
 *
 *   npm run build && npx serve out -p 4600
 *   node scripts/verify-live-flows.mjs [baseUrl]
 *
 * Requires a build whose .env.local has NEXT_PUBLIC_* set (any plausible
 * values — every /api/* call is intercepted); without them the app boots to
 * "This page couldn't load" and every check below reports a false negative.
 *
 * A real backend is not available in CI, so every /api/* call is stubbed. That
 * is an honest half-verification, and the half that matters most: it runs the
 * real client code, so it proves what the app SENDS and how it survives what
 * comes back. It does not prove the server accepts it.
 *
 * WHY THIS EXISTS. It found a white-screen that four unit-test suites, tsc and
 * the lint ratchet all passed over: AnnotatedResumePanel wrote a fresh
 * mirror-box object on every "nothing to highlight" pass, which closed a
 * render loop and killed the whole Analyze workspace with React #185 — after
 * the user had already spent a scan from their daily quota. Nothing that reads
 * source could have caught it; it only appears when the thing actually runs.
 * Add a block here whenever a flow can only be proved by running it.
 */
const _pw = await import("/opt/node22/lib/node_modules/playwright/index.js");
const chromium = _pw.chromium ?? _pw.default?.chromium;
const BASE = process.argv[2] || "http://localhost:4600";
const results = {};
// A byte-plausible PDF: the client runs a size/type check before uploading.
const FAKE_PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(40000, 0x20), Buffer.from("\n%%EOF")]);
const browser = await chromium.launch();

async function page(width = 1600) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => (results.pageErrors ??= []).push(e.message));
  // The builder ships with the example résumé loaded, so importing triggers an
  // overwrite confirm(). Playwright auto-DISMISSES dialogs, which silently
  // aborted the import and looked like a broken feature.
  p.on("dialog", (d) => d.accept());
  return { ctx, p };
}

/* ── 1. ATS review: what does it put on the wire? ─────────────────── */
{
  const { ctx, p } = await page();
  let captured = null;
  await p.route("**/api/analyze", async (route) => {
    captured = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      overallScore: 78,
      categoryScores: { readability: 84, atsCompatibility: 82, jobMatch: 70, achievementQuality: 76,
        quantification: 71, sectionStructure: 79, languageQuality: 80, technicalBranding: 75 },
      summary: "Solid engineering résumé with strong metrics.",
      topStrengths: ["Quantified impact"], topIssues: [], atsWarnings: [],
      keywordAnalysis: { matchedKeywords: ["React"], missingKeywords: ["Kubernetes"], keywordScore: 70, suggestions: [] },
      sectionFeedback: [], rewriteSuggestions: [],
      bulletAnalysis: [], finalRecommendations: [],
    })});
  });
  await p.goto(`${BASE}/template-builder/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);

  await p.getByText(/check ats/i).first().click().catch(() => {});
  await p.waitForTimeout(1200);
  await p.locator('textarea[placeholder*="job posting"]')
    .fill("Senior software engineer. React, TypeScript, Kubernetes, AWS.");
  await p.waitForTimeout(300);
  await p.getByRole("button", { name: /check my r/i }).first().click();
  await p.waitForTimeout(2500);

  const sr = captured?.structured_resume;
  results.atsReview = {
    requestSent: !!captured,
    hasCandidateProfile: typeof captured?.candidate_profile === "string" && captured.candidate_profile.length > 40,
    hasStructuredResume: !!sr,
    structuredShape: sr ? {
      full_name: sr.full_name,
      experienceCount: sr.experience?.length,
      firstRoleHasBullets: (sr.experience?.[0]?.bullets?.length ?? 0) > 0,
      datesJoined: sr.experience?.[0]?.dates,
      skillCategories: sr.skills?.map((s) => s.category),
      educationBullets: sr.education?.[0]?.bullets,
    } : null,
    scoreRendered: await p.evaluate(() => /\b78\b/.test(document.body.innerText)),
  };
  await ctx.close();
}

/* ── 2. Résumé import: does the parsed doc reach the builder? ─────── */
{
  const { ctx, p } = await page();
  await p.route("**/api/upload-resume", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      structuredResume: {
        full_name: "Imported Person", headline: "", location: "Austin, TX",
        email: "imported@example.com", phone: "(512) 555-0100", linkedin: "", github: "", summary: "Imported summary line.",
        skills: [{ category: "Languages", items: ["Rust", "Go"] }],
        experience: [{ company: "Imported Corp", role: "Staff Engineer", dates: "Jan 2021 – Present",
          location: "Austin, TX", bullets: ["Shipped an imported bullet with 42% impact"] }],
        education: [], projects: [], extra_sections: [], section_order: [],
      },
      extractedText: "Imported Person\nStaff Engineer at Imported Corp",
    })});
  });
  await p.goto(`${BASE}/template-builder/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  // Set the hidden input directly — more reliable than racing a file chooser.
  await p.locator('input[type=file]').first()
    .setInputFiles({ name: "resume.pdf", mimeType: "application/pdf", buffer: FAKE_PDF });
  await p.waitForTimeout(3000);
  results.import = {
    errorShown: await p.evaluate(() => {
      const m = document.body.innerText.match(/(Upload failed|Could not extract|Failed to map|Import failed)[^\n]*/);
      return m ? m[0] : null;
    }),
    nameLandedInBuilder: await p.evaluate(() =>
      [...document.querySelectorAll("input")].some((i) => i.value === "Imported Person")),
    bulletLandedOnPaper: await p.evaluate(() => document.body.innerText.includes("imported bullet with 42%")),
  };
  await ctx.close();
}

/* ── 3. Analyze paper: does the workspace render, and is the page
      boundary drawn on it? PageFitMeter is deliberately NOT expected
      here — it lives in the builder top bar, which Analyze has no
      equivalent of; Analyze gets the dashed rule instead. ───────── */
{
  const { ctx, p } = await page();
  await p.route("**/api/analyze-upload", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      overallScore: 71,
      categoryScores: { readability: 80, atsCompatibility: 74, jobMatch: null, achievementQuality: 70,
        quantification: 66, sectionStructure: 72, languageQuality: 78, technicalBranding: 69 },
      summary: "Analyze mock.", topStrengths: [], topIssues: [], atsWarnings: [],
      keywordAnalysis: { matchedKeywords: [], missingKeywords: [], keywordScore: null, suggestions: [] },
      bulletAnalysis: [], finalRecommendations: [],
      sectionFeedback: [{ section: "Experience", score: 72, feedback: "Add more metrics." }],
      rewriteSuggestions: [],
      extractedText: "Alex Johnson\nSoftware Engineer\n• Did a thing with 20% impact",
      resumeHeader: ["Alex Johnson", "Software Engineer"],
      structuredResume: {
        full_name: "Alex Johnson", headline: "", location: "", email: "", phone: "", linkedin: "", github: "",
        summary: "Mock summary.", skills: [],
        experience: [{ company: "Acme", role: "Engineer", dates: "2020 – Present", location: "", bullets: ["Did a thing with 20% impact"] }],
        education: [], projects: [], extra_sections: [], section_order: [],
      },
      bulletMap: [],
    })});
  });
  await p.goto(`${BASE}/?view=analyze`, { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  await p.locator('input[type=file]').first()
    .setInputFiles({ name: "r.pdf", mimeType: "application/pdf", buffer: FAKE_PDF });
  await p.waitForTimeout(5000);
  results.analyzeMeter = {
    workspaceRendered: await p.evaluate(() => /\b71\b/.test(document.body.innerText)),
    pageRulePresent: await p.evaluate(() => document.body.innerText.includes("PAGE 1 ENDS")),
  };
  await ctx.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
