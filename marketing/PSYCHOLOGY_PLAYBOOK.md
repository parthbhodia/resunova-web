# Marketing psychology playbook

Applied notes from "Marketing Psychology, Decoded" (a @samriddhisdiary guide,
21 concepts). The source is a general creator/founder primer. This file is the
Resunova version: the mechanism in one line, then what it actually looks like
on our surfaces, then the guardrail for where it goes wrong.

Read this before drafting a blog post, a comparison page, a promo email, or an
image asset. It does not replace the lane recipes in
`.claude/agents/marketing-agent.md`; it is the layer that decides how a true
claim gets said once you know what the claim is.

## The honesty line

Every principle below works by making a true thing land harder. None of them
is a licence to make an untrue thing land at all. The source guide draws the
line the same way: the difference between manipulation and good marketing is
honesty about what you are offering.

Our audience makes this sharper than usual. Job seekers arrive anxious, often
unemployed, and frequently already burned by a tool that scored their résumé
against nothing. Pressure tactics that read as merely aggressive in SaaS read
as predatory here, and they undercut the one claim that is ours alone: that
our validators delete AI feedback the résumé does not support.

Never ship:

| Prohibited | Why |
|---|---|
| Countdown timers, "expires tonight", "only N spots" where no deadline or cap exists | Fake urgency and fake scarcity. Costs the honesty position outright |
| A stat framed so the reader infers something the query does not support | Framing is word choice, not arithmetic. See rule 4 in the agent file |
| Anchoring against a price we never charged | The anchor has to be real |
| Loss framing aimed at fear of unemployment ("still jobless?", "they picked someone else") | Punching a bruise. Frame loss against the effort already spent, never against the person's worth or their odds |
| Social proof numbers that are not live-verified and dated | Same rule as every other number |
| A decoy tier invented to push people to Pro | Pricing structure is a product decision, not a copy decision. Flag it, do not ship it |

Everything else below is fair game.

## Which principles apply to which lane

| Lane | Lead with |
|---|---|
| Data posts (`app/blog/<slug>`) | Information gap, framing, processing fluency, peak-end, social proof, anchoring |
| Reddit and social distribution | Information gap, von Restorff, rule of 7, pratfall, social proof |
| Comparison pages (`/compare/[slug]`) | Framing, choice architecture, processing fluency, pratfall |
| Promo and lifecycle email (`marketing/drafts/`) | Fresh start, Zeigarnik, commitment and consistency, endowment, reciprocity, loss aversion |
| Image assets (`marketing/html/`) | Gold gradient, von Restorff, processing fluency, vibe branding |
| Product surfaces (flag only, do not edit) | Choice overload, decoy effect, choice architecture defaults, von Restorff (see the note under 02) |

---

## 01. The gold gradient effect

**Mechanism.** Warm metallic gradients read as premium before a single word is
processed, because gold maps to rarity and achievement. The source is specific
that the *gradient* is doing the work: depth and shine are what separate it
from a flat warm colour.

**Where we actually are.** We own the warm accent and not the gradient.
`marketing/html/base.css` has `--amber: #c4793a` and `--amber-h: #e09050`, both
flat. Amber appears as a gradient only in the stage background (a 16% radial
wash plus a 10% dot pattern), which is atmosphere, not accent. The one gradient
that fills an element is blue: `linear-gradient(135deg, #2563eb, #1d4ed8)` on
the CTA. So the premium cue currently rests on a flat square (`BrandLogo.tsx`
draws the mark as flat `#c4793a`) and the blue button gets the shine.

**Two hard scoping rules.**

1. **Marketing templates only.** In the app, `--amber` is a *status* token, one
   of `--green --amber --red --yellow` (`DESIGN.md`). Brand is `--accent`,
   `#0969da`. Amber on an app surface reads as caution, so never propose it as
   a premium cue on the score ring, a tier badge, or anything else in-product.
   The warm-equals-valuable reading holds inside `marketing/html/` and on the
   logo mark, and nowhere past that boundary.
2. **One per asset.** Amber marks the single element carrying the value:
   the headline stat on an OG card, the Pro line in a pricing asset, the
   milestone in a launch graphic.

**If we want the real thing.** `--amber` to `--amber-h` is already the two-stop
ramp a warm-metallic gradient needs. The source's own strongest use is
milestone moments (Spotify Wrapped turning a stats recap into something worth
sharing), which maps cleanly onto launch day, a PH feature, or a corpus
milestone. That is an asset-level experiment, worth proposing on a specific
graphic rather than applied as a blanket token change.

**Guardrail.** Amber on six elements is amber on zero. If an asset has more
than one warm accent, one of them is decoration.

## 02. Von Restorff effect

**Mechanism.** In a carousel or grid, make *one* slide, *one* CTA, or *one*
product visually different, and that is the one people remember and click. The
count is the whole principle. A sea of sameness gets scanned and forgotten, and
the single break in the pattern gets processed deeply.

**A set property, not an item property.** This is the trap, and we walked into
it. Von Restorff describes an item's relationship to its neighbours, so it can
only be decided by looking at the whole set. A per-item field can never encode
it: applying a predicate across a collection yields a *partition*, and a
partition has no odd one out.

`hasFinding()` in `lib/atsBlogPosts.ts` is exactly that. It keys off whether a
post has a `stat`, and the split today is 4 with, 5 without.
`app/blog/page.tsx` then renders them as two labelled sections, `research` and
`guides`. Two groups of comparable size in separate sections is a taxonomy, and
a good one, but nothing in it is isolated. Worse, the arrow points the wrong
way: data posts are the main weekly lane, so the stat-card group only grows.
Once it is the clear majority, the *guides* become the isolates and inherit the
memory advantage, which is the opposite of what we want clicked.

**Where the isolate actually goes.** One per set, chosen at the set level:

- **Blog index.** Exactly one post gets the different treatment, the current
  lead finding, picked by index position rather than by whether it has a stat.
  That is a separate decision from `hasFinding` and complements it.
- **Inside a post.** One chart styled unlike the others. That is the one that
  gets screenshotted into a Reddit comment.
- **PH gallery.** Five slides is a real grid, and it is the clearest case we
  have. Right now the warm accent sits on `ph-01-hero` and `ph-03-rewrites`,
  two of five, so there is no isolate. Meanwhile `ph-02-honest` is built
  entirely from status red and green, which makes the differentiator slide read
  as a diff table rather than as the break in the pattern. `LAUNCH_KIT.md`
  argues the honesty claim is the one nobody else can copy. If one slide breaks
  the pattern, its own reasoning says slide 2.

**Co-presence is required.** The items have to be seen at once. A carousel, a
grid, a gallery, a pricing table: yes. The four Google Ads sizes in
`render_gads.py` go to different placements and are never seen together, so
there is no set to stand out from. Differentiate *within* one ad, never across
artefacts nobody views side by side.

**Guardrail.** Two rules now. Never invent a stat to fill the slot; the comment
on `hasFinding` is right that an empty slot beats a decorated one. And never
call a category an isolate: if the different-looking thing appears more than
once in the set, the effect is not running.

**Flagged on product surfaces (not this agent's lane, recorded so it is not
lost).** The same partition pattern runs through the three surfaces that carry
the most decision weight, because each of them colours every item independently
from that item's own score:

- Analysis, the 8 category tiles: `analyzeViewHelpers.tsx` bands green at 80,
  yellow at 60, red below. Three groups, no isolate.
- Analysis, "Top Fixes": `AnalyzeResume.tsx` filters categories scoring under
  70 and sorts ascending, then `AnalyzeImprovementPlan.tsx` renders every entry
  with the same `--surface2` fill and `--border`. Row one is the single highest
  value action in the product and looks exactly like row four.
- Tailor: `TailorScoreboard.tsx` bands by ratio at 0.9 and 0.6, and
  `TailorWorkQueue.tsx` runs crit/warn/good tones.

Severity banding is a good status system and answers "how bad is each item?".
Von Restorff answers a different question, "which one do I look at first?", and
sorting cannot answer it either: position is ordering, not contrast. Note also
that whatever marks the isolate cannot be amber, since that channel is already
spoken for by status (see 01). Any change here belongs to `DESIGN.md` and the
impeccable plus redesign skills, not to this agent.

## 03. Framing effect

**Mechanism.** The same fact, worded as a gain or a loss, as a percentage or a
count, produces different decisions.

**On Resunova.** Before a headline stat ships, write it three ways and pick.
"41.4% of entry-level postings disclose salary" and "nearly 6 in 10 entry-level
postings hide it" are the same query. The second is the post. The `statLabel`
field exists because the framing has to survive being cropped onto an OG card.

**Guardrail.** Reframing is choosing which true sentence to lead with. The
moment a frame requires the reader to misread the number, it is rule 4 in the
agent file, not framing.

## 04. Choice architecture

**Mechanism.** Four levers decide the outcome more than the options do: order,
defaults, *number of options*, and visual hierarchy. The source's instruction
is blunt: pre-highlight the one you want most people to pick, and do not leave
the choice neutral. A neutral layout is not a neutral act, it just hands the
decision to whichever option happens to be first or easiest to compare.

**In the marketing lane.** Put the internal link to the product page at the
point of highest conviction, right after the finding lands, never in a footer.
One primary action per email with a muted secondary, never two equals.

**The pricing case, where this principle collides with 08.** The source says to
highlight one of three tiers. We did something different and better, and the
reasoning is recorded in the `PricingPlans.tsx` header: three plan towers were
replaced by one plan and a billing toggle, because the plans only ever differed
by a number, so three near-identical feature lists "made the reader do the
diffing." That is choice overload solving what choice architecture would have
patched. The lesson to carry: when options differ on one axis, cutting the
comparison beats decorating it. Reach for a highlight only when the options
genuinely differ.

**The defaults case, and the best in-house example of the honesty line.** The
most consequential choice in the product is tailoring mode, `honest` or
`aggressive` (`lib/tailoringMode.ts`). Choice architecture predicts a default
would carry most users, and the source's own Netflix example is the dark
version of that: autoplay means you must actively choose to *stop*. This
product inverts it three times. The modal is blocking by design, so no default
rides silently on a setting that "shapes every rewrite from then on." The
pre-selected option is the conservative one, not the one that would inflate
keyword coverage. And the API's anti-fabrication floor is identical in both
modes, so the architecture *bounds* the riskier option instead of merely
labelling it. When a draft needs to show what honest marketing looks like in
practice, this is the example, and it is already shipped.

**Guardrail.** Defaults, pre-selection, and opt-out checkboxes inside the
product are product decisions. Flag them in shared memory and leave them. The
boundary is sharp: architecture that makes a good choice *easier* is fair,
architecture that makes a bad choice *harder to notice* is not.

## 05. Information gap theory

**Mechanism.** Awareness of a gap between what you know and what you want to
know creates a discomfort the brain will act to close.

**This is the house default.** Not one of 21, the lead technique. Open with the
gap, not the answer, on every surface: hero, blog title, ad, email subject,
Reddit post. "We checked which seniority level actually posts salary" opens a
loop. "Entry-level roles disclose salary 41.4% of the time" closes it in the
title and gives the reader nothing to click for.

**The formula.** Three parts. Drop one and it stops working.

1. **A specific, finite unknown.** "Eight things" is countable and closed.
   "Transform your career" is vague, and vague does not itch.
2. **Stakes the reader already accepts.** "Whether your résumé gets read" needs
   no argument. If you have to explain why it matters, the line is too long.
3. **A close they can reach now.** About 60 seconds, free, no account. The
   cheaper the close, the harder the hook pulls, which is why our free tier is
   a copywriting asset and not just a pricing decision.

**State the recurring offer, not the trial.** The free plan is 3 scans a day,
every day (`FREE_SCAN_DAILY_LIMIT`), and writing "your first scan free" shrinks
that to a single shot in the reader's head. Two facts that sit next to each
other and must never be merged: 3 a day is the signed-in free plan, and the
no-account offer covers the first scan only. Both true, one sentence each.

**The one-line test.** After reading it, can the reader state the exact question
they now want answered? If they cannot name the question, it is vague rather
than curious. If the line already answers it, the loop is shut.

**Where our gaps come from.** Every one is something the product or the corpus
computes and the reader does not know: which of the 8 dimensions their résumé
fails, which single bullet is doing the least work, which keywords from a
specific job post are missing, what an ATS actually extracts from their file,
how they rank against the live postings. Each item on that list is a headline,
an email, and an ad. Mine it rather than inventing intrigue.

**The SEO tension, resolved.** Gap titles and search pull opposite ways on the
blog: search wants the number in the title, the gap wants it withheld. Split
the slots rather than choosing. The h1 and the social share open the gap; the
meta description, the OG card, and the `stat` field in `lib/atsBlogPosts.ts`
carry the number.

**Guardrail (a growth rule, not a scruple).** The gap has to close, and close
bigger than the hook promised. A hook that does not pay off spends the next
post's clickthrough, so the tax lands on the campaign rather than on the
reader. Worked example with a full surface family:
`marketing/drafts/2026-08-11-homepage-information-gap.md`.

## 06. Endowment effect

**Mechanism.** People value what feels like theirs, and giving it up registers
as a loss even when nothing was paid.

**We inherit this one instead of manufacturing it, and that is a strategic
advantage.** Every example in the source (Notion, Canva Pro, free trials) is a
product that has to get you to *build* something before day 14 so cancelling
feels like a loss. Our artefact is the user's résumé, the most identity-laden
document a job seeker owns, and they arrive already owning it. So the job is
not "make them build something." It is: take custody of something they already
own, make it visibly better, and make the improved version the one they will
not go back from.

**Stage 1: possession has to be felt, not just implemented.** The mechanic
already works. An anonymous scan is stashed in localStorage
(`ANON_ANALYSIS_STASH_KEY`), survives the OAuth redirect, and is restored into
the user's history on sign-in. But endowment requires *awareness* of
possession, and a visitor who closes the tab not knowing the report was kept
has none of it, however good the code is. Saying so is the cheapest win
available: name the artefact at the moment it exists.

**Stage 2: co-authorship is the real ownership moment.** A score is something
we did *to* their résumé. An applied rewrite is something they did *with* us,
in their own words. That is the crossing from "I got a report" to "this is my
improved résumé." Retention email 2 exists precisely because the top fix often
goes unapplied, which means a large share of users never cross. Getting one
rewrite applied in the first session is the highest-value endowment action in
the product.

**Stage 3: naming.** Users cannot name a version. Labels are derived
(`resumeHeader?.[0]`, then `full_name`, then "Resume") and `ResumeLibrary`
offers categories rather than rename. Letting someone call a version "Stripe
PM, v2" is the classic endowment multiplier and it is the one clear gap. A
product ask, flagged not acted on.

**What is already right, do not break it.** The full first report is free and
unlocked before any ask, which is exactly the source's prescription: let people
build before you sell. And the sign-in prompts are already possession-framed
("keep your report history", "saved to your history") rather than toll-framed.
Someone understood this before the playbook existed.

**Copy that follows from it.** Name what they have, never what we offer:
"saved on this device" beats "create an account to save"; "your report is saved
here, sign in to keep it when you close this tab" beats "sign in to rescore",
because the first protects a possession and the second sells a feature.

**Guardrail.** Only for users who actually hold the artefact. The retention
sequence is scoped to users with at least one completed scan for this reason.
Claiming someone owns something they have not made is the one way this
backfires.

## 07. Peak-end rule

**Mechanism.** An experience is remembered by its most intense moment and its
ending. The middle is largely lost.

**On Resunova.** Every draft needs a designated peak and a designated last
line. In a data post the peak is the chart that proves the headline; put it
above the methodology, never after. The closing line is what gets quoted, so
it should be the finding restated in plain words, not a CTA that reads as an
ad break.

**Guardrail.** If you cannot point at the peak, the post does not have one.

## 08. Choice overload

**Mechanism.** Past a small number of options, decisions get harder and more
people decide nothing.

**On Resunova.** Three or fewer. Three Reddit title variants, not eight. Two
or three subject lines per email. One next action per asset. Applies to
information as much as options: a post with nine findings has none.

**Guardrail.** Fewer options for the reader, not less rigour for us. Run the
eight variants, ship the three. And three is a ceiling, not a target: when the
options differ on a single axis, one is the right number. See the pricing case
under 04, where three tiers collapsed to one plan and a toggle for exactly that
reason.

## 09. The pratfall effect

**Mechanism.** A competent brand becomes more likeable after admitting a
small, real flaw, provided the competence is not in doubt.

**On Resunova.** This is our natural voice, not a tactic bolted on. The
product's differentiator is that it deletes its own bad advice. Comparison
pages get more trustworthy, not less, when they say plainly what a competitor
does better. A methodology section that names a sample-size caveat reads as
more credible than one that does not.

**Guardrail.** The flaw has to be real, minor, and paired with visible
competence. Domino's admitted the pizza was bad and showed the new recipe. An
admission with no fix behind it is just bad news.

## 10. Vibe branding

**Mechanism.** People buy a feeling and a self-image before they buy a feature
list, especially younger audiences.

**Start from what the reader wants, not from what we admire about ourselves.**
They want to get past the filter and be seen. That is the whole job. Nobody is
shopping for a candid résumé tool.

**The vibe is Direct.** Short declaratives, no padding. "Upload your résumé. We
do the rest." "Free stops at 3 résumé scans a day." `AGENTS.md` bans
"seamlessly", "effortlessly" and rule-of-three filler outright. That is the
whole voice, and it is enough.

**Candour and precision are mechanism, never positioning.** They are why the
advice works, not a value to sell. An AI that invents problems makes a résumé
*worse*, because the user "fixes" things that were never broken and ships the
damage. So the validators are not a virtue we advertise, they are the reason
our fixes can be trusted to move an ATS score. Sell the outcome, use the
candour as proof when the outcome is questioned.

**The frame, already in our own copy.** "ATS silently drops your application."
And the strongest line in the repo, a blog title: "How ATS Really Works (And
Why You're Invisible, Not Unqualified)". That reframes rejection from *I am not
good enough* to *the machine did not see me*, which is the actual anxiety and
the actual promise. Write toward that.

**The house rhetorical move: define by contrast with the lazy alternative.**
The most consistent pattern in existing copy, and reusable as a formula.
"Instead of a generic bank." "Most AI résumé tools invent problems to look
smart." "Never a mystery number." When a claim feels flat, name the lazy
version it is not.

**Guardrail.** Vibe is consistency, not mood-per-post. If an asset needs a
different tone to work, the asset is wrong.

## 11. Commitment and consistency

**Mechanism.** A small yes makes the next, larger yes easier, because people
act to stay consistent with a self-image they have already signalled.

**On Resunova.** The ladder is already built: free scan with no account, then
account, then a saved version, then Pro. Copy should ask for the next rung
only. A blog post asks for a scan, not a subscription.

**Guardrail.** Each rung has to be worth taking on its own. A first step whose
only purpose is to make the second easier is a trick, and the free scan is a
real product.

## 12. Anchoring

**Mechanism.** The first number seen becomes the ruler for every number after
it.

**On Resunova.** The corpus is the anchor. Leading with "across 247,000 live
US postings" sets the scale before any finding lands, and a finding read
against a quarter of a million postings feels different from the same finding
read cold. In pricing copy, the anchor is the alternative cost (what a résumé
writing service charges), never a struck-through price we never billed.

**Guardrail.** Corpus size is credibility context, not a capability claim. Rule
1 in the agent file still applies: insights, not methods.

## 13. Loss aversion

**Mechanism.** A loss is felt about twice as strongly as an equivalent gain,
so avoiding one motivates more than gaining one.

**On Resunova.** The honest version points at sunk effort, not at fear.
"Forty applications, same résumé each time" is a true loss the reader already
paid and can still stop paying. "Your top fix is still open" beats "improve
your résumé" for the same reason.

**Guardrail.** This is the principle most likely to turn ugly on this
audience. Never frame the loss as the job, the reader's odds, or their worth.
Frame it as wasted effort they control. Anything that reads as "you are
failing" gets cut.

## 14. The fresh start effect

**Mechanism.** Motivation spikes right after a temporal landmark, because the
landmark separates the past self from the present one.

**On Resunova.** Job searching has unusually strong landmarks: New Year, the
start of a month, Monday morning, graduation season, and the autumn and
January hiring waves. Time launches and re-engagement sends to them rather
than to arbitrary dates. The day-30 and day-60 re-engagement emails in
`RETENTION_EMAIL_SEQUENCE.md` are the obvious candidates for landmark timing.

**Guardrail.** Landmark timing is a scheduling note for the human who sends.
The agent drafts and flags the timing; it does not schedule.

## 15. Processing fluency

**Mechanism.** Information that is easier to read is judged more true. The
brain mistakes ease for accuracy.

**On Resunova.** This is the mechanical reason the house style rules exist,
and it is worth more to us than to most products because we are asking people
to believe a number. Short sentences, one idea per paragraph, whitespace
around charts, no jargon in a headline. A finding stated plainly is believed;
the same finding hedged across three clauses is not.

**Guardrail.** Fluency applies to the prose, not to the caveats. Small-n
warnings and definitions stay, in the methodology section where they belong.

## 16. Rule of 7

**Mechanism.** A message needs roughly seven exposures before it converts.
Repetition builds familiarity, familiarity builds trust.

**On Resunova.** One post is not a test. A finding should ship as the post,
the OG card, two Reddit variants, the email digest line, and an X or LinkedIn
share, with the same headline number in each. Consistency across two or three
weeks beats a single perfect artefact.

**Guardrail.** Repeat the message, not the asset. Seven identical posts are one
exposure and six blocks.

## 17. Scarcity vs urgency

**Mechanism.** Scarcity is limited quantity, urgency is limited time. Both
push action now, for different reasons.

**On Resunova.** We have exactly one honest instance of each, and neither is
promotional. Scarcity: the free tier's 3 scans a day, which is a real cap.
Urgency: a real application deadline on a posting in the jobs feed. Both are
facts about the user's situation, which is the only kind we use.

**Guardrail.** Overuse erodes trust faster than it converts, and fabricated
countdowns get noticed. If there is no real cap and no real deadline, the
draft does not get one.

## 18. Decoy effect

**Mechanism.** A third, deliberately weaker option shifts preference between
the original two.

**On Resunova.** Understand it, mostly so you can name it when a competitor is
doing it on a page we compare against. We have two plans, Free and Pro, plus
free access for students at partner universities. Adding a tier to make Pro
look better is a pricing decision, and pricing is not this lane.

**Guardrail.** If a comparison page seems to want a decoy, the honest fix is
better framing of what Pro already includes.

## 19. Social proof

**Mechanism.** Under uncertainty, people copy what others did.

**On Resunova.** Proof belongs next to the decision, not in a footer. The
strongest verified figures we have are the corpus scale and the early-user
count; both must be live-verified and dated before they ship, per the numbers
rule in `marketing/README.md`. On Reddit, the proof is the chart itself, since
a subreddit trusts a reproducible finding more than a testimonial.

**Guardrail.** Every proof number is a number, which means rule 4 applies. No
rounding up, no stale counts.

## 20. Reciprocity

**Mechanism.** Receiving something of value creates a felt obligation to give
something back.

**On Resunova.** The whole content strategy is this principle. The data posts
give away findings nobody else can produce, the scan is free and needs no
account, and neither asks for anything first. That sequencing is the strategy,
not a lead magnet dressed as one.

**Guardrail.** The gift has to be usable without buying. A post that withholds
its finding behind an email form spends the trust the post was meant to build.

## 21. Zeigarnik effect

**Mechanism.** Unfinished tasks hold attention. An open loop keeps nagging
until it closes.

**On Resunova.** The product generates real open loops: a score with fixes not
yet applied, a tailored résumé started and not downloaded, a scan from a
résumé that has since changed. Naming the specific unfinished thing outperforms
any generic nudge, and the merge variables in the retention sequence exist to
make that specificity possible.

**Guardrail.** Only loops the user actually left open. A manufactured
progress bar that fills when we say so is the fake-countdown mistake wearing a
different hat.

---

## Pre-publish pass

Run this over any draft before it goes on a branch or into `marketing/drafts/`.

1. **Gap.** Does the hook open a loop, or answer it in the title?
2. **Frame.** Did you write the headline number at least three ways?
3. **Peak.** Can you point at the single strongest moment? Is it early enough?
4. **End.** Is the last line the finding, and would someone quote it?
5. **Fluency.** Any sentence you had to read twice? Any em dashes, any
   "seamlessly", any rule-of-three padding?
6. **Contrast.** Is exactly one element visually different, and is it the one
   that matters?
7. **Proof.** Is the strongest verified number adjacent to the ask?
8. **Ladder.** Is the ask the next rung, not three rungs up?
9. **Honesty sweep.** Every number verified and dated, every scarcity and
   urgency claim real, no loss framing aimed at the reader's odds or worth.

Item 9 is the one that is not negotiable. The other eight make a true claim
land harder; that one is what keeps it true.
