"use client";

/**
 * The prompt that slides in while someone is reading a blog post.
 *
 * WHY IT EXISTS. 361 tracked views across 11 posts and zero confirmed
 * subscribers: the post is the best door the site has and nothing on it asks
 * for anything until the very end. WHY IT IS NOT A MODAL: a full-screen overlay
 * on the first screen of a search visit is the pattern Google's interstitial
 * guidance targets, and these pages arrive mostly from search. So this is a
 * card in the right-hand gutter on a wide screen and a bar along the bottom
 * everywhere else. It never takes focus, never dims the page and never locks
 * scroll.
 *
 * WHEN. Only once the reader is half way down the article AND has spent 45
 * seconds of visible time on it, once per session, and never while the inline
 * signup form is on screen. The rules live in `lib/blogPrompt.ts`; this file
 * only wires them to the DOM.
 *
 * WHAT. The offer follows what the reader is doing. A data post offers the next
 * analysis by email. A résumé post offers a posting check, unless the reader is
 * signed in, because that offer's footnote promises a sign-in step. The
 * methodology page offers nothing.
 *
 * ⚠️ Not built: the desktop exit card in the comp. It is the one dialog in the
 * design, it needs a focus trap, and it adds a second trigger whose payoff
 * cannot be told apart from this one at current volume.
 */

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import NextLink from "next/link";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import { filledButtonSx, fieldSx } from "@/components/mui/cssVars";
import { useReaderSignedIn } from "@/hooks/useReaderSignedIn";
import { trackEvent } from "@/lib/analytics";
import {
  PROMPT_COPY,
  articleDepth,
  isEligible,
  isSuppressed,
  markShownThisSession,
  promptVariantFor,
  readMemory,
  rememberNever,
  rememberSnooze,
  shownThisSession,
} from "@/lib/blogPrompt";
import {
  SUBSCRIBE_CONFIRM_MESSAGE,
  SUBSCRIBE_ERROR_MESSAGE,
  SUBSCRIBE_INVALID_MESSAGE,
  isLikelyEmail,
  subscribeToBlog,
} from "@/lib/blogSubscribe";

type Phase = "idle" | "open" | "sent" | "gone";
type Status = "idle" | "busy" | "error";

function storage(kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export default function BlogReaderPrompt({ slug }: { slug: string }) {
  const signedIn = useReaderSignedIn();
  const variant = promptVariantFor(slug, signedIn);

  const titleId = useId();
  const fullRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  // Phone and tablet only: the bar rests as one line and opens on request. The
  // wide-screen card is always open, and CSS decides which applies.
  const [expanded, setExpanded] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const formVisibleRef = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Whether the inline signup form is on screen. Read two ways: by the arming
  // check (do not appear on top of it) and by render (step aside if it arrives).
  useEffect(() => {
    if (!variant || phase === "gone" || typeof IntersectionObserver === "undefined") return;
    const target = document.querySelector("[data-blog-subscribe]");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      formVisibleRef.current = entry.isIntersecting;
      setFormVisible(entry.isIntersecting);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [variant, phase]);

  // Arming: watch depth and visible time, appear once both are met.
  useEffect(() => {
    if (!variant) return;
    const local = storage("localStorage");
    const session = storage("sessionStorage");
    if (isSuppressed(readMemory(local), Date.now()) || shownThisSession(session)) return;

    let dwellMs = 0;
    let depth = 0;
    let frame = 0;
    let done = false;
    const TICK_MS = 1000;

    const measure = () => {
      const article = document.querySelector("[data-blog-article]");
      depth = article ? articleDepth(article.getBoundingClientRect(), window.innerHeight) : 0;
    };
    const stop = () => {
      done = true;
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    const check = () => {
      if (done || formVisibleRef.current) return;
      if (!isEligible({ variant, depth, dwellMs, suppressed: false, shownThisSession: false })) return;
      stop();
      markShownThisSession(session);
      setPhase("open");
      trackEvent("blog_prompt_shown", {
        post: slug,
        variant,
        depth_pct: Math.round(depth * 100),
        dwell_s: Math.round(dwellMs / 1000),
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
        check();
      });
    };
    // Only VISIBLE time counts. A tab in the background is not reading.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") dwellMs += TICK_MS;
      measure();
      check();
    }, TICK_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return stop;
  }, [variant, slug]);

  // Opening the bar on a phone is the reader's own tap, so moving focus into it
  // is a response to them rather than a grab.
  useEffect(() => {
    if (expanded) fullRef.current?.querySelector<HTMLElement>("input, a")?.focus();
  }, [expanded]);

  const dismiss = useCallback(
    (how: "close" | "never") => {
      if (!variant) return;
      trackEvent("blog_prompt_dismissed", { post: slug, variant, how });
      const local = storage("localStorage");
      if (how === "never") rememberNever(local);
      else rememberSnooze(local, Date.now());
      setPhase("gone");
    },
    [slug, variant],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "busy" || !variant) return;
    if (!isLikelyEmail(email)) {
      setStatus("error");
      setError(SUBSCRIBE_INVALID_MESSAGE);
      return;
    }
    setStatus("busy");
    setError("");
    try {
      // `prompt:` keeps this attributable apart from the inline form, which
      // stores the bare slug.
      await subscribeToBlog(email, `prompt:${slug}`);
      trackEvent("blog_prompt_submitted", { post: slug, variant });
      rememberNever(storage("localStorage"));
      setEmail("");
      setStatus("idle");
      setPhase("sent");
    } catch {
      setStatus("error");
      setError(SUBSCRIBE_ERROR_MESSAGE);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && phase === "open") dismiss("close");
  }

  if (!variant || (phase !== "open" && phase !== "sent")) return null;
  const copy = PROMPT_COPY[variant];

  return (
    <aside
      className="bp"
      aria-labelledby={titleId}
      data-variant={variant}
      data-phase={phase}
      data-expanded={expanded ? "true" : "false"}
      data-stepped-aside={formVisible && phase === "open" ? "true" : "false"}
      onKeyDown={onKeyDown}
    >
      {phase === "open" ? (
        <div className="bp-rest">
          <span className="bp-rest-title">{copy.title}</span>
          <Button
            variant="contained"
            onClick={() => setExpanded(true)}
            sx={{ ...filledButtonSx, textTransform: "none", minWidth: 76 }}
          >
            {copy.rest}
          </Button>
          <IconButton aria-label="Close" onClick={() => dismiss("close")} sx={{ color: "var(--muted)" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      ) : null}

      <div className="bp-full" ref={fullRef}>
        {phase === "sent" ? (
          <div className="bp-sent" role="status">
            <span className="bp-tick" aria-hidden="true">
              <CheckIcon fontSize="inherit" />
            </span>
            <div>
              {/* Not "Check your email": the confirm message below says so, and the
                  same words twice in a row read as a stuck screen. */}
              <h2 id={titleId} className="bp-title">
                One more step
              </h2>
              <p className="bp-why">{SUBSCRIBE_CONFIRM_MESSAGE}</p>
              <Button
                variant="text"
                onClick={() => setPhase("gone")}
                sx={{ textTransform: "none", color: "var(--muted)", textDecoration: "underline", justifyContent: "flex-start", px: 0 }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="bp-top">
              <h2 id={titleId} className="bp-title">
                {copy.title}
              </h2>
              {/* 44px target pulled into the corner so the heading keeps its line. */}
              <IconButton
                aria-label="Close"
                onClick={() => dismiss("close")}
                sx={{ color: "var(--muted)", mt: "-10px", mr: "-10px" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
            <p className="bp-why">{copy.why}</p>

            {variant === "email" ? (
              <form onSubmit={onSubmit} noValidate className="bp-form">
                <TextField
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setError("");
                    }
                  }}
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      "aria-label": "Email address",
                      autoComplete: "email",
                      inputMode: "email",
                      maxLength: 320,
                    },
                  }}
                  sx={fieldSx}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={status === "busy"}
                  sx={{ ...filledButtonSx, textTransform: "none" }}
                >
                  {status === "busy" ? "Adding…" : copy.cta}
                </Button>
                {status === "error" ? (
                  <p role="alert" className="bp-error">
                    {error}
                  </p>
                ) : null}
              </form>
            ) : (
              <Button
                component={NextLink}
                href="/?view=analyze"
                variant="contained"
                fullWidth
                onClick={() => {
                  trackEvent("blog_prompt_clicked", { post: slug, variant });
                  rememberNever(storage("localStorage"));
                }}
                sx={{ ...filledButtonSx, textTransform: "none" }}
              >
                {copy.cta}
              </Button>
            )}

            <div className="bp-foot">
              <small className="bp-note">{copy.note}</small>
              <Button
                variant="text"
                onClick={() => dismiss("never")}
                sx={{ color: "var(--muted)", textTransform: "none", textDecoration: "underline", fontSize: 12 }}
              >
                Don&apos;t show again
              </Button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
