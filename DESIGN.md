# Design — system, tooling, and how to run a design pass

Read this before any visual work. It covers three things: the design system as
it is actually shipped, which of the two design tools to reach for, and the
process that keeps a redesign honest.

> **This does not override [`AGENTS.md` § Material Design](AGENTS.md#material-design).**
> Chrome is Material Design 3 with MUI, and that section wins wherever the two
> touch — **including marketing pages**, which is now settled (see §3). This
> file covers the shared token vocabulary, the marketing conventions, and the
> process.

---

## 1. The two tools, and why both

Both are installed as project skills under `.claude/skills/`.

| | what it is | what it is for |
|---|---|---|
| **`impeccable`** | deterministic 59-rule detector + design hook | the **verifier**. Runs on UI edits, catches what is mechanically checkable |
| **`redesign-existing-projects`** | audit checklist + upgrade techniques (taste-skill) | the **art direction**. Composition, rhythm, and what is missing |
| **`imagegen-frontend-web`** | image-only reference boards | comps before code, when a direction needs to be seen first |

**They do not overlap, and that is the point.** Measured on `/pricing`: the
detector found **zero** issues on a page that had three equal towers, a
misaligned feature list, no legal links and `100vh`. The taste audit found
eight, none of which a static rule could reach. In the other direction the
detector caught three real defects in taste-driven work, including a 10.5px
label under the legibility floor and two WCAG AA failures that would have
shipped.

So: **art direction proposes, the detector disposes.** Never run only one.

Confirmed again on the tailor results rail: the taste pass produced the
rearrangement (deliver, orient, work) that the detector has no rule for, and the
detector then found two WCAG AA failures and a per-row treatment that was most
of why the screen read as a wall of alarm — 15 findings down to 3. Point it at
the **built** page, not the source, so computed styles are real:

```bash
npx impeccable detect app/pricing/                 # full fidelity, resolves its own deps
npx impeccable detect out/tailor-preview/index.html # or a built page, for computed styles
```

⚠️ The **bundled** detector (the one the hook runs) is in **DEGRADED regex
mode** — `htmlparser2`, `css-select` and `domutils` are not in this project's
dependency tree, so computed contrast, custom properties and selector matching
are skipped. It says so on every run. A clean result from the hook is *an
undercount, not a clean bill of health*; `npx impeccable detect` is the one to
trust until those are added as devDependencies.

---

## 2. The system as shipped

Derived from `app/globals.css` and `lib/typography.ts`, not from intentions. If
this section and the code disagree, the code is right and this file is stale.

**Themes are attribute-driven**, `[data-theme="light"|"dark"]` on the root — not
Tailwind's `dark:` class convention. Raw Tailwind colour utilities silently never
adapt. Always go through a token.

| role | token | light |
|---|---|---|
| page | `--bg` | `#f7f9fc` |
| card | `--surface` / `--surface2` / `--surface3` | `#ffffff` / `#eef3f8` / `#dbe4ee` |
| text | `--text` / `--muted` / `--dim` | `#0f172a` / `#475569` / `#64748b` |
| brand | `--accent` / `--accent-h` / `--accent-bg` | `#0969da` |
| status | `--green` `--amber` `--red` `--yellow` + `-bg` / `-ink` | |
| on a fill | `--on-fill` | `#ffffff` (dark: `#0d1117`) |

**There are three places text can sit, and each has its own token.** Getting
these confused is the single most common contrast bug in this repo.

| text sits on | use | example |
|---|---|---|
| a surface | `--text` / `--muted` / `--dim` | body copy on a card |
| a **tint** (`--*-bg`) | `--*-ink` | a green chip, a band strip |
| a **solid fill** (`--accent`, `--green`, `--*-ink` used as a background) | `--on-fill` | a primary button, a status dot |

**`-ink` variants exist for text on a tint.** `--green` on `--green-bg` is ~2:1;
`--green-ink` is ~7:1. Text on a tinted chip uses `-ink`, always.

**`--on-fill` exists for text on a solid fill, and is one token rather than one
per hue on purpose.** Every hue token here is tuned to be readable *as text* on
the theme's background, so in dark mode they are all light — which makes them
good fills and bad backgrounds for white text. Measured on the shipped controls:
`#fff` was 2.53:1 on `--accent` and 1.52:1 on `--green-ink`, while light passed
at 5.19 and 5.48. One hardcoded foreground cannot be right in both themes. The
rule is a property of the family, so one token states it; a hue that ever breaks
it can earn its own. The fills are deliberately unchanged — near-black on them
measures 7.49:1 to 13.12:1, whereas darkening the fills to a colour white can
sit on reaches only 4.63:1 *and* costs the button its presence against the card
(6.85:1 → 3.73:1).

**Type is a ladder, not free numbers.** `lib/typography.ts` and the `--fs-*`
custom properties, kept in sync by a test:

`10 · 11 · 12 · 13 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48`

`lib/__tests__/typography.test.ts` scans every `.ts/.tsx` for a fractional
`fontSize` and fails on any file outside the print-metric exemption list. Marketing
display type above 48 is fine in a page-scoped stylesheet; fractional sizes in
components are not.

**Shape / elevation / motion** for app chrome come from Material:
`var(--md-shape-*)`, the six elevation levels, `var(--md-easing-standard)` with
`var(--md-duration-medium)`. Never `transition: all`.

**Fonts** are self-hosted through `next/font` — Geist (`--font-sans`), Inter,
DM Sans. Newsreader italic is loaded **on `/pricing` only**, in that route's own
module, so the extra face is not paid for elsewhere. Scope a display face to its
route the same way.

### Off limits

The résumé paper and the PDF export path. See
[`AGENTS.md` § Off limits](AGENTS.md#off-limits) — those sizes are print metrics,
MUI components vanish from the download, and app-theme vars like `--border` are
not in the export stylesheet.

---

## 3. Marketing surfaces

`/pricing`, the landing page, `/resume-examples`, `/cover-letter`, the SEO pages.

**Settled: marketing counts as chrome, so components are MUI.** `/pricing` is the
worked example — `ToggleButtonGroup` for the billing switch, `Button`, `Chip`,
`Alert`, and a `Paper` on `--md-shape-lg` with `--md-elevation-3`. The provider
is scoped to the panel (the `BoostPanel` shape), so only that route pays for
Emotion.

**Layout and art direction stay page-scoped CSS** — `.lp-*` for landing, `.pr-*`
for pricing, in `app/globals.css`. Colour fields, display type and overlap need
media queries and pseudo-elements that `sx` and inline styles cannot express,
and there is no component there to reuse.

The dividing line: **if it is a control, it is MUI; if it is a canvas, it is
CSS.** Static list rows are neither, and stayed plain elements — wrapping inert
markup in `Stack` buys an Emotion class and nothing else.

Motion is CSS on the Material scale (`--md-easing-*`, `--md-duration-*`), not
the `motion` package: it is in `package.json` but no component imports it.
Entrances are removed outright under `prefers-reduced-motion`, not shortened.

### Invariants learned the hard way on `/pricing`

1. **A colour field must size to its own content.** Copy coloured *for* a field
   (white on brand blue) will eventually land off a fixed-height field when a
   headline wraps, and render invisible. Make the field a block that wraps its
   text; produce overlap by having the *panel* hang below it.
2. **Derive clearance, never guess it.** The panel hangs by `--pr-overhang`, and
   the space beneath is `calc(overhang + header)` because that sum is the
   worst-case overhang. A magic number breaks the first time content changes.
3. **Numbers in marketing copy come from constants.** Every limit on `/pricing`
   is interpolated from `FREE_*`/`PRO_*` in `UpgradeDialog`, with a test. A
   hardcoded "3 scans a day" becomes a lie the day the limit changes, in front
   of someone about to pay.
4. **Do not put an unverifiable stat on a public page.** Corpus sizes and
   outcome claims need a source you can check today, or they do not ship.
5. **A palette that flips lightness needs a per-mode contrast pair.** One
   `contrastText` served both modes and produced 2.53:1 on every dark-mode MUI
   button. `theme.test.ts` now asserts the ratio rather than the literal.
6. **Text on a tint uses `-ink`.** `--accent` on `--accent-bg` is 4.46:1 in
   light, which is why `--accent-ink` exists alongside the green/amber/red ones.
7. **A filled control never hardcodes its foreground.** `color: "#fff"` on a
   hue-token background is readable in exactly one theme; use `--on-fill`.
   `tailorQueueMotion.test.ts` fails the build on the pairing, at baseline zero.
   The rule generalises the MUI `contrastText` fix in 5 to every filled control,
   and both now route through the same colour so the two palettes cannot
   disagree about it.
8. **One palette per theme.** `globals.css` defined both palettes twice under
   identical selectors, so the later copy silently won and the earlier was dead
   code — which had already drifted on three shadow tokens, meaning an edit to
   it produced no effect and no error. `themeTokens.test.ts` fails on any
   property declared twice under one selector. Deliberately narrow: shadcn's
   `:root` defaults being overridden by the app palette is a cascade, not a
   duplicate.

---

## 3b. In-app surfaces

The signed-in workspace: Analyze, Tailor, Jobs, the queue rail. Denser than
marketing, and the pressure here is the opposite one — not "is this bland" but
"is everything shouting at once".

**Redundant severity is noise, not accessibility.** The tailor queue rendered
nine rows each with a 3px coloured left-bar in its band's tone. The comment
defended them as severity surviving greyscale and colour-blind vision. It did
not: a red bar against an amber bar in the same position is still colour-only.
The band a row sits in and the words in its verdict chip are what carry severity
without colour, and the stripe was a third copy of one idea repeated down the
list. A stripe now means one thing — *this row is what you are working* — and
at most one is on screen. Before adding a per-row accent, ask which channel it
adds that the grouping and the words do not.

**One primary action per screen, aimed at a subset.** A queue of nineteen rows
with nineteen equally-weighted controls asks the user to triage before they can
start. The fix is to aim the primary control at the band that matters and widen
it once that is clear — **not** to collapse the rest. Hiding work is a worse
bug: it shipped once and printed a band header counting the rows that survived
the cap.

**A control that names a count must attempt that set.** The label and the target
come from one list, and a test drives the click and asserts what was handed
over. Asserting only the label passes while the button quietly runs five rows
behind a promise of two — that mutation went green here first time.

**State the outcome before asking for work, and only what is true.** The tailor
results page opened with a red count and a grey page title; the moment the user
came for was the quietest thing on screen. Stating it is half the fix — the
other half is that the sentence has to track what actually happened, which is
why `lib/tailorResultHeadline.ts` exists as a pure function with its own test
rather than a ternary in the header. "Your tailored résumé" before a single fix
is applied is the same class of overclaim as a score labelled "live" while
nothing recounts.

**A number's provenance survives every redesign.** Both score lines keep the
sentence saying where the figure came from, and both directions are pinned. The
cheap way to "fix" an over-promising label is to promise it again.

---

## 4. Running a design pass

1. **Read the brief and say what you think it is** in one line before touching
   code. Most weak output comes from jumping to a default aesthetic.
2. **Audit first on an existing surface.** Invoke `redesign-existing-projects`
   and go through it. Write the findings down before proposing anything.
3. **Comp before committing** when the direction is a real change. Build the
   options as a standalone page against the *real* tokens and fonts, screenshot
   them, and pick one. Do not rewrite a live surface to explore.
4. **Verify with the detector**, then **measure in a browser**. Both.
5. **Then implement**, and run the repo gates: `npx tsc --noEmit`, `npm test`,
   `node scripts/lint-ratchet.mjs`, `npm run build`.

### The verification rules that actually matter

**Measure; do not assert.** A screenshot is not a contrast reading and an
eyeball is not an alignment check. The `/pricing` feature-list bug was
`y=458` against `y=438` — invisible in prose, obvious in a measurement.

**Composite to an opaque ancestor before judging contrast.** An alpha tint or a
positioned colour field measured against the wrong backdrop reports a passing
design as a failure, and has done here twice.

**A check that cannot see is indistinguishable from a system that works.**
Before trusting a clean result, break the thing on purpose and confirm the check
goes red. The detector was mutation-tested against the exact `/pricing` file
before its zero-findings result was believed.

**Mutation-test a new test.** If a test claims to guard behaviour, stub that
behaviour and watch it fail. A mutation that does not apply proves nothing —
assert the edit landed before trusting the result.

**Drive the real surface, and enumerate the buttons.** Several bugs in this
repo's history were "broken feature" reports from a drive that skipped a confirm
step. After each click, look at what the UI actually offers next.

**Match the leaf, not the wrapper.** A DOM query for text can resolve to a
parent whose `textContent` happens to be identical — a chip inside a flex
wrapper with no siblings, a row inside its band `<li>`. Both have produced a
check reading an empty `style` and reporting a pass. Constrain to the element
that carries what you are measuring (`children.length === 0`, a `data-` hook).

**Say what you did not verify.** A surface that needs a signed-in session and a
completed analysis cannot be driven from a static export. Unit tests plus a comp
measurement is a real level of evidence; it is not the same as having seen it
run, and the difference belongs in the commit.
