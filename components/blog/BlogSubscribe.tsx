"use client";

/**
 * Email capture for the blog.
 *
 * Deliberately quieter than `CTACard`: a post that ends with a product CTA and
 * then this one would otherwise stack two loud boxes competing for the same
 * glance, which is how both stop being read. The product CTA keeps the gradient
 * and the filled button; this is a plain bordered row.
 *
 * The pitch is the research, not the product. Someone who just read a
 * corpus-derived finding is being asked for the next finding — "resume tips in
 * your inbox" would be a different (and weaker) offer to that reader.
 */

import { useId, useState } from "react";
import { isLikelyEmail, subscribeToBlog } from "@/lib/blogSubscribe";

type Status = "idle" | "busy" | "done" | "error";

export default function BlogSubscribe({
  /** Post slug, or "index" from the blog index. Stored for attribution. */
  source,
}: {
  source: string;
}) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "busy") return;

    if (!isLikelyEmail(email)) {
      setStatus("error");
      setMessage("That doesn't look like an email address.");
      return;
    }

    setStatus("busy");
    setMessage("");
    try {
      await subscribeToBlog(email, source);
      setStatus("done");
      // Says "check your email", NOT "you're on the list" — this is double
      // opt-in, so nothing is subscribed until they click the link, and telling
      // them otherwise would be a false confirmation they never get corrected on.
      //
      // Same copy whether the address is new, already pending, already
      // confirmed, or opted out: the endpoint deliberately does not tell us
      // which, so that it cannot be used to test whether someone is subscribed.
      setMessage("Check your email for a link to confirm. It should arrive in a minute.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("That didn't go through. Try again in a moment.");
    }
  }

  return (
    <section
      aria-labelledby={`${inputId}-heading`}
      style={{
        margin: "44px 0 0",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "22px 22px 20px",
      }}
    >
      <h2
        id={`${inputId}-heading`}
        style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3, margin: "0 0 6px" }}
      >
        Get the next one
      </h2>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 520 }}>
        We publish what about 270,000 live job postings actually say: salary disclosure, ghost listings, what
        employers really require. No newsletter filler, and we don&apos;t send often.
      </p>

      {status === "done" ? (
        <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <label htmlFor={inputId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
            Email address
          </label>
          <input
            id={inputId}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setMessage("");
              }
            }}
            // `flex: "1 1 220px"` rather than a width: the field fills the row on
            // a desktop and wraps to its own line on a phone with no media query.
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              padding: "10px 13px",
              borderRadius: 9,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={status === "busy"}
            style={{
              padding: "10px 20px",
              borderRadius: 9,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: status === "busy" ? "default" : "pointer",
              opacity: status === "busy" ? 0.7 : 1,
            }}
          >
            {status === "busy" ? "Adding…" : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "var(--red-ink, #d97757)" }}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
