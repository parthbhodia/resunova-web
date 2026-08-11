# Homepage: the gap hero, and the campaign built on it

Status: DRAFT for human review. Applies principle 05 from
`marketing/PSYCHOLOGY_PLAYBOOK.md`.

**Decision: A2 is the hero.** Everything below builds the campaign around it.

---

## The hero

> ### Eight things decide whether your résumé gets read.
> ### You are guessing at all eight.
>
> Upload it and see all 8 scores in about 60 seconds. Every score under 95
> shows its reasoning, so you know which fix moves the number. Free, no account.

Replaces:

> Score your résumé. Fix the weak bullets. Tailor it to any job. Start free.

## Why this one converts

**It sells an asset we already own.** The 8-dimension score is our most
concrete differentiator and it was sitting in the subhead as a spec. Moving it
into the headline turns a feature into a question the reader cannot answer
about themselves.

**There is no friction between the curiosity and the payoff.** The line opens a
loop and the product closes it in about 60 seconds for free with no account.
Most funnels put a signup between the question and the answer, which is where
curiosity dies.

**Competitors cannot run this line.** Not because they lack the idea, but
because their answer sits behind a wall. A gap headline only works if the close
is instant, so our pricing model is what makes the copy defensible. That is a
positioning moat, not a style choice.

**The current hero is not weak, it is closed.** Three imperatives naming input,
process, and output before the reader has formed a question they care about.
Nothing is left unresolved, so nothing pulls.

---

## Ship it everywhere (rule of 7)

One message, every touchpoint, same eight. Repetition across formats is what
converts, and a single placement is not a test.

| Surface | Copy |
|---|---|
| Hero H1 (shipped) | Eight things decide whether an ATS passes your résumé on. You are guessing at all eight. |
| OG / social card | Eight things decide whether an ATS passes your résumé on. |
| Meta description (shipped) | See the 8 checks that decide whether an ATS passes your resume on. Honest rewrites, a tailored PDF, and 3 free scans a day. Start with no account. |
| PH tagline (48 chars) | Eight things decide if an ATS passes you on |
| Display ad, landscape | Eight checks decide. You have seen none of your scores. |
| Search ad headlines | `8 checks decide. See yours.` / `Your résumé fails 2 of 8.` / `3 free ATS scans a day` |
| Reddit (r/jobs) | Eight things decide whether an ATS passes your résumé on. Most people can only name three. |
| Email 1 subject | Your résumé scored 8 ways. Here is the weakest one. |
| Email 2 subject | One of your eight is still open. |
| Email 5 subject | Your eight scores are from a résumé you have since changed. |
| Win-back subject | You never saw two of your eight. |

The email lines reuse merge data the retention sequence already computes, so
each one names the reader's own specific unknown rather than a generic hook.

---

## The method, so you can write more of these

A gap needs three parts. Drop one and it stops working.

1. **A specific, finite unknown.** "Eight things" works because it is countable
   and closed. "Transform your career" is vague, and vague does not itch.
2. **Stakes the reader already accepts.** "Whether your résumé gets read" needs
   no argument. If you have to explain why it matters, the line is too long.
3. **A close they can reach now.** About 60 seconds, free, no account. The
   cheaper the close, the harder the hook pulls.

**The one-line test.** After reading it, can the reader state the exact question
they now want answered? If they cannot name the question, it is vague rather
than curious. If the line already answers it, the loop is shut. "Here are 3
résumé mistakes" fails on the second count. "Eight things decide whether your
résumé gets read" passes: the question is *which eight, and how do I score?*

**Where the gaps come from.** Every one is something the product computes and
the reader does not know:

- which of the 8 dimensions their résumé fails
- which single bullet is doing the least work
- which keywords from a specific job post are missing
- what an ATS actually extracts from their file
- how they rank against the live postings in the corpus

That list is the raw material. Each item is a headline, an email, and an ad.

---

## One tension worth knowing about

Gap-shaped titles and SEO pull in opposite directions on the blog: search wants
the number in the title, the gap wants it withheld. Do not choose, split the
slots. The h1 and the social share open the gap; the meta description, the OG
card stat, and the `stat` field in `lib/atsBlogPosts.ts` carry the number.
Different slots, different jobs, and the post still ranks.

---

## Test plan

Ship the hero against the current copy, one variable, H1 and subhead together.
The current copy is the control.

If it wins, the next test is nerve versus specificity: run
*"We will tell you what is wrong with your résumé before you make an account"*
against the eight-things hero. That tells you which half is carrying the
result, the specific unknown or the instant free close, and whichever wins
becomes the spine of the next quarter of copy.
