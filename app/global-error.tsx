"use client";

/**
 * Root error boundary.
 *
 * Without this file Next renders its own fallback: a black screen reading
 * "This page couldn't load", with no branding, no way to reach the rest of the
 * site, and no hint of what went wrong. A user who hits it can only report
 * "the page is broken", which is exactly how a site-wide config outage reaches
 * us as a screenshot of a black rectangle.
 *
 * So this one does three things the default cannot: it looks like Resunova, it
 * offers a way out that is not just Reload, and it shows the error text. That
 * last part is a deliberate trade. Error strings are normally kept away from
 * users, but this app is a static export with no server-side error reporting,
 * so the person looking at the screen is the only channel we have. A short
 * message they can copy turns an unactionable report into a diagnosable one.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Also put it in the console, where anyone checking devtools will look.
    console.error("Resunova root error:", error);
  }, [error]);

  const detail = [error?.message, error?.digest && `digest ${error.digest}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0b0b0d",
          color: "#f4f4f5",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              margin: "0 auto 20px",
              background: "#c4793a",
            }}
          />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Something broke on our end
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "#a1a1aa", margin: "0 0 20px" }}>
            This is not something you did, and your saved résumés are safe. Try
            again, and if it keeps happening send us the details below.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "none",
                background: "#f4f4f5",
                color: "#0b0b0d",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                color: "#f4f4f5",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
            <a
              href="/contact/"
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #3f3f46",
                color: "#f4f4f5",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Contact us
            </a>
          </div>

          {detail ? (
            <p
              style={{
                marginTop: 22,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#71717a",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                wordBreak: "break-word",
              }}
            >
              {detail}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
