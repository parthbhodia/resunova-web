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
| Product surfaces (flag only, do not edit) | Choice overload, decoy effect, choice architecture defaults |

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

**Mechanism.** The item that looks different from its neighbours is the item
that gets remembered.

**On Resunova.** `lib/atsBlogPosts.ts` already builds this in: posts with a
`stat` get a stat-led card on the blog index and everything else gets a plain
row, so a real finding stands out from a guide by shape, not by shouting. Use
the same move inside a post (one chart styled unlike the rest is the one that
gets screenshotted into a Reddit comment) and across a PH gallery (the honesty
slide should not look like the other four).

**Guardrail.** The comment on `hasFinding` is the rule: never invent a stat to
fill the slot. An empty slot beats a decorated one.

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

**Mechanism.** Order, defaults, and visual hierarchy quietly decide the
outcome more than the options themselves do.

**On Resunova.** Applies to how we present what already exists. In a post,
put the internal link to the product page at the point of highest conviction,
right after the finding lands, not in a footer. In an email, one primary
action and one muted secondary, never two equals.

**Guardrail.** Changing defaults inside the product (pre-selected plans,
opt-out checkboxes) is a product decision. Note it in shared memory and leave
it.

## 05. Information gap theory

**Mechanism.** Awareness of a gap between what you know and what you want to
know creates a discomfort the brain will act to close.

**On Resunova.** This is the single highest-leverage principle for the data
lane, because our corpus produces facts nobody can look up. Open with the gap,
not the answer. "We checked which seniority level actually posts salary" opens
a loop. "Entry-level roles disclose salary 41.4% of the time" closes it in the
title and gives the reader nothing to click for.

**Guardrail.** The gap has to close inside the post, and close bigger than the
hook promised. A title that withholds a payoff we do not have is a clickbait
tax we pay on the next post.

## 06. Endowment effect

**Mechanism.** People value what feels like theirs, and giving it up registers
as a loss even when nothing was paid.

**On Resunova.** The free scan does this work already: by the time someone has
a scored résumé, applied bullet rewrites, and a saved version, the artefact is
theirs. Copy should name the thing they built ("your 8-dimension score", "the
three fixes still open on your résumé") rather than describe our features.

**Guardrail.** Only for users who actually have the artefact. The retention
sequence is scoped to users with at least one completed scan for exactly this
reason.

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
eight variants, ship the three.

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

**On Resunova.** Our three words are honest, exact, unhurried. That is what
the navy-and-amber palette, DM Sans, and the no-em-dash rule in `AGENTS.md` are
collectively defending. The vibe is the reason the copy rules exist: a page
selling fact-checked AI cannot read as machine-written.

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
