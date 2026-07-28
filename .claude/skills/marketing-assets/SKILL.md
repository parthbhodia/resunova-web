---
name: marketing-assets
description: Rules and pipeline for producing Resunova marketing assets — Google Ads images, annotated UAT/product screenshots, PH gallery slides. Use whenever creating or editing anything in marketing/ (html templates, render scripts, assets) or capturing annotated product screenshots for partners, ads, or launch material.
---

# Resunova marketing assets

## Writing rules (owner preference, non-negotiable)

1. **No dashes in copy.** Do not use em dashes or en dashes anywhere in
   marketing copy, annotation callouts, or mocked product content that will be
   visible in a screenshot. Restructure into separate sentences, commas, or
   parentheses instead. Hyphens inside compound words (role-aware, dead-letter)
   are fine.
2. **Annotation callouts must never cover the content they explain.** The red
   highlight box outlines the feature; the comment box goes in adjacent
   whitespace (below the box, over less important content, or in an empty
   column). If the highlighted element spans most of the viewport width, place
   the callout BELOW it, never on top of the text being showcased.

## Annotated screenshot pipeline

- Driver script pattern: `scratchpad/ip-annotated.js` (Playwright against the
  local dev server). It injects an in-page `__annotate(specs)` helper that
  draws a red rounded-rect (3px solid #e11d48 + soft glow) around a target
  element found by text, plus a red comment box (#e11d48 bg, white 13.5px
  DM Sans text, radius 13px) positioned by `side: left|right|top|bottom` with
  `dx/dy/w` overrides. Screenshot at 1512x940 viewport, deviceScaleFactor 2.
- Targets are found by text content and snapped to the nearest `.rounded-2xl`
  card (shadcn Card). Scroll sections into view with
  `scrollIntoView({block:'center'})` and wait ~1s before annotating.
- The app needs `web/.env.local` with `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` plus
  DUMMY Supabase vars (any https URL + key) or AuthGate crashes at
  `getSupabaseClient()`. Seeding localStorage key `sb-<ref>-auth-token` with a
  fake far-future session makes the app treat the browser as signed in; using
  an `@umbc.edu` email activates the UMBC branding variant (gold banner),
  which is desirable for UMBC-facing packets.
- Product data comes from Playwright `context.route()` mocks. Key response
  shapes: `/api/generate-interview-questions` returns
  `{resume_questions, jd_questions, behavioral_questions, company_questions}`
  as arrays of OBJECTS `{question, reason?, star_framework?, best_story?}`
  (plain strings get filtered out and the UI shows "No questions returned"),
  plus `coding_questions` as `{question, source, source_url, is_inferred,
  difficulty, tags[]}` and `session_id`. Stories endpoint returns
  `{stories:[{id,title,theme,source_experience,situation,task,action,result,
  reflection,created_at}]}` in snake_case.
- Interview Prep routes: `/interview-prep/` (details) →
  `/interview-prep/interview-type` → `/interview-prep/setup` (button text is
  "Start Practice Session") → `/interview-prep/dashboard`. Other tools are
  query views on `/`: `?view=analyze|builder|library|jobs|profile|cover-letter`
  (NOT `?view=cover` or `?view=interview`).

## Static image assets (ads, PH gallery, social)

- HTML templates in `marketing/html/*.html` share `marketing/html/base.css`
  (dark navy stage, amber Nova R mark, DM Sans from `marketing/fonts/`).
  Render with `marketing/render.py` (PH/social sizes) or
  `marketing/render_gads.py` (Google Ads sizes) using the preinstalled
  Chromium at `/opt/pw-browsers/chromium`.
- Google Ads responsive display sizes: landscape 1200x628 (1.91:1), square
  1200x1200, square logo 1200x1200, landscape logo 1200x300 (4:1).
- Honest numbers only: corpus and per-company figures must come from
  live-verified values recorded in resunova-api CLAUDE.md (247k active US
  postings, NVIDIA 287, Salesforce 285, Accenture 765, etc.). Do not invent
  metrics.
