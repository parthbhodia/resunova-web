import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { DWELL_MS, MEMORY_KEY, SESSION_KEY } from "@/lib/blogPrompt";

/**
 * The reader prompt, driven the way a reader drives it: a page with an article
 * and an inline signup form, a scroll position, and a clock.
 *
 * jsdom has no layout, so the article's box is stubbed and the 1-second tick
 * that measures it is advanced with fake timers. What these pin is the
 * BEHAVIOUR (when it appears, what it remembers, what it sends); the decisions
 * themselves are in blogPrompt.test.ts.
 */

const signedIn = vi.hoisted(() => ({ current: false as boolean | null }));
vi.mock("@/hooks/useReaderSignedIn", () => ({ useReaderSignedIn: () => signedIn.current }));

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent }));

const subscribeToBlog = vi.hoisted(() => vi.fn());
vi.mock("@/lib/blogSubscribe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blogSubscribe")>()),
  subscribeToBlog,
}));

import BlogReaderPrompt from "@/components/blog/BlogReaderPrompt";
import { SUBSCRIBE_CONFIRM_MESSAGE, SUBSCRIBE_ERROR_MESSAGE, SUBSCRIBE_INVALID_MESSAGE } from "@/lib/blogSubscribe";

const VIEWPORT = 800;
const ARTICLE_HEIGHT = 2000;
let articleTop = VIEWPORT; // article entirely below the fold

/** Scroll so that `depth` of the article is above the bottom of the viewport. */
function scrollTo(depth: number) {
  articleTop = VIEWPORT - depth * ARTICLE_HEIGHT;
}

function Page({ slug }: { slug: string }) {
  return (
    <>
      <article data-blog-article="">text</article>
      <section data-blog-subscribe="">inline form</section>
      <BlogReaderPrompt slug={slug} />
    </>
  );
}

async function read(seconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });
}

const prompt = () => screen.queryByRole("complementary");
const full = () => within(document.querySelector(".bp-full") as HTMLElement);

let hidden = false;
let intersecting = false;
let observers: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  localStorage.clear();
  sessionStorage.clear();
  signedIn.current = false;
  hidden = false;
  intersecting = false;
  observers = [];
  articleTop = VIEWPORT;
  trackEvent.mockClear();
  subscribeToBlog.mockReset();
  subscribeToBlog.mockResolvedValue(undefined);
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEWPORT });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const isArticle = this.hasAttribute("data-blog-article");
    return { top: isArticle ? articleTop : 0, height: isArticle ? ARTICLE_HEIGHT : 0, bottom: 0, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
  });
  class FakeObserver {
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observers.push(cb);
    }
    observe() {
      observers.forEach((cb) => cb([{ isIntersecting: intersecting }]));
    }
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("when the prompt appears", () => {
  it("stays away until the reader is half way down AND has spent 45 seconds", async () => {
    render(<Page slug="ghost-jobs-duplicate-postings" />);

    // Deep but quick: skimming.
    scrollTo(0.9);
    await read(10);
    expect(prompt()).toBeNull();

    // Long but shallow: a tab left open at the top of the page.
    scrollTo(0.1);
    await read(60);
    expect(prompt()).toBeNull();

    // Nearly half way, and well past the time: still reading, not yet deep.
    scrollTo(0.45);
    await read(5);
    expect(prompt()).toBeNull();

    // Both.
    scrollTo(0.6);
    await read(1);
    expect(prompt()).not.toBeNull();
    expect(trackEvent).toHaveBeenCalledWith("blog_prompt_shown", expect.objectContaining({
      post: "ghost-jobs-duplicate-postings",
      variant: "email",
    }));
  });

  it("does not count time while the tab is in the background", async () => {
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.9);
    hidden = true;
    await read(120);
    expect(prompt()).toBeNull();

    hidden = false;
    expect(DWELL_MS).toBe(45_000);
    await read(44);
    expect(prompt()).toBeNull();
    await read(2);
    expect(prompt()).not.toBeNull();
  });

  it("appears once per session", async () => {
    const first = render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.9);
    await read(46);
    expect(prompt()).not.toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBe("1");
    first.unmount();

    render(<Page slug="salary-transparency-by-seniority" />);
    await read(120);
    expect(prompt()).toBeNull();
    expect(trackEvent.mock.calls.filter(([name]) => name === "blog_prompt_shown")).toHaveLength(1);
  });

  it("does not appear on top of the inline signup form", async () => {
    intersecting = true;
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.95);
    await read(120);
    expect(prompt()).toBeNull();
    // And it was never recorded as shown, so it can still appear later.
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("steps aside if the inline form scrolls into view after it appeared", async () => {
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.6);
    await read(46);
    expect(prompt()).toHaveAttribute("data-stepped-aside", "false");

    await act(async () => {
      observers.forEach((cb) => cb([{ isIntersecting: true }]));
    });
    expect(prompt()).toHaveAttribute("data-stepped-aside", "true");
  });

  it("does not take focus when it appears", async () => {
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    const before = document.activeElement;
    scrollTo(0.9);
    await read(46);
    expect(prompt()).not.toBeNull();
    // The email field exists the moment the prompt does; if focus is not on it,
    // the prompt did not reach for it.
    expect(document.querySelector(".bp-full input")).not.toBeNull();
    expect(document.activeElement).toBe(before);
    expect(prompt()).not.toContainElement(document.activeElement as HTMLElement);
  });

  it("moves focus into the opened bar only because the reader asked for it", async () => {
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.9);
    await read(46);
    const rest = document.querySelector(".bp-rest") as HTMLElement;
    fireEvent.click(within(rest).getByRole("button", { name: "Get it" }));
    expect(document.activeElement).toBe(document.querySelector(".bp-full input"));
  });
});

describe("what it offers", () => {
  it("offers a posting check to a signed-out reader of a résumé post, straight into the analyzer", async () => {
    render(<Page slug="tailor-resume-to-job-description" />);
    scrollTo(0.9);
    await read(46);
    const link = full().getByRole("link", { name: "Check my résumé" });
    // The analyzer, not a modal over the post: signing in from a modal would
    // return the reader to the post, and the analyzer is what they came for.
    expect(link).toHaveAttribute("href", "/?view=analyze");
    expect(full().getByText(/Free account, no credit card/)).toBeInTheDocument();
  });

  it("offers email, not the résumé check, to a signed-in reader of the same post", async () => {
    signedIn.current = true;
    render(<Page slug="tailor-resume-to-job-description" />);
    scrollTo(0.9);
    await read(46);
    expect(full().getByRole("button", { name: "Send me the next one" })).toBeInTheDocument();
    expect(full().queryByText(/sign in on the next screen/i)).toBeNull();
  });

  it("offers nothing on the methodology page, or before the session is known", async () => {
    const { unmount } = render(<Page slug="methodology" />);
    scrollTo(0.9);
    await read(120);
    expect(prompt()).toBeNull();
    unmount();

    signedIn.current = null;
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    await read(120);
    expect(prompt()).toBeNull();
  });
});

describe("what it remembers", () => {
  async function open(slug = "ghost-jobs-duplicate-postings") {
    const view = render(<Page slug={slug} />);
    scrollTo(0.9);
    await read(46);
    return view;
  }

  it("a close is a 30-day snooze", async () => {
    const view = await open();
    fireEvent.click(full().getByRole("button", { name: "Close" }));
    expect(prompt()).toBeNull();
    expect(trackEvent).toHaveBeenCalledWith("blog_prompt_dismissed", expect.objectContaining({ how: "close" }));
    view.unmount();

    // A new session, 29 days on: still quiet. Literal days, not SNOOZE_MS, so a
    // shortened constant cannot shorten this check along with it.
    sessionStorage.clear();
    vi.setSystemTime(Date.now() + 29 * 24 * 60 * 60 * 1000);
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.9);
    await read(120);
    expect(prompt()).toBeNull();
  });

  it("a snooze ends: a new session after 30 days sees it again", async () => {
    const view = await open();
    fireEvent.click(full().getByRole("button", { name: "Close" }));
    view.unmount();

    sessionStorage.clear();
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    scrollTo(0.9);
    await read(46);
    expect(prompt()).not.toBeNull();
  });

  it("'Don't show again' is permanent", async () => {
    const view = await open();
    fireEvent.click(full().getByRole("button", { name: /don.t show again/i }));
    expect(prompt()).toBeNull();
    expect(JSON.parse(localStorage.getItem(MEMORY_KEY) as string)).toEqual({ never: true });
    view.unmount();

    sessionStorage.clear();
    vi.setSystemTime(Date.now() + 600 * 24 * 60 * 60 * 1000);
    render(<Page slug="ghost-jobs-duplicate-postings" />);
    await read(120);
    expect(prompt()).toBeNull();
  });

  it("Escape closes it without a keyboard trap", async () => {
    await open();
    fireEvent.keyDown(prompt() as HTMLElement, { key: "Escape" });
    expect(prompt()).toBeNull();
  });

  it("clicking through to the analyzer is permanent too", async () => {
    render(<Page slug="tailor-resume-to-job-description" />);
    scrollTo(0.9);
    await read(46);
    const link = full().getByRole("link", { name: "Check my résumé" });
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("blog_prompt_clicked", expect.objectContaining({ variant: "posting_check" }));
    expect(JSON.parse(localStorage.getItem(MEMORY_KEY) as string).never).toBe(true);
  });
});

describe("signing up from it", () => {
  async function open() {
    render(<Page slug="linkedin-applicant-count-clicks-not-applications" />);
    scrollTo(0.9);
    await read(46);
  }
  const type = (value: string) => fireEvent.change(full().getByLabelText("Email address"), { target: { value } });
  const submit = async () => {
    await act(async () => {
      fireEvent.submit(full().getByLabelText("Email address").closest("form") as HTMLFormElement);
    });
  };

  it("sends the address with a source that tells it apart from the inline form", async () => {
    await open();
    type("Reader@Example.com");
    await submit();
    expect(subscribeToBlog).toHaveBeenCalledWith("Reader@Example.com", "prompt:linkedin-applicant-count-clicks-not-applications");
    expect(trackEvent).toHaveBeenCalledWith("blog_prompt_submitted", expect.objectContaining({ variant: "email" }));
  });

  it("says 'check your email', never 'you're subscribed', because the list is double opt-in", async () => {
    await open();
    type("reader@example.com");
    await submit();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(SUBSCRIBE_CONFIRM_MESSAGE);
    expect(status).not.toHaveTextContent(/you.re (on|subscribed)/i);
    // The heading must not repeat the message under it.
    expect(within(status).getByRole("heading", { name: "One more step" })).toBeInTheDocument();
  });

  it("is remembered as a permanent answer, so a subscriber is never asked again", async () => {
    await open();
    type("reader@example.com");
    await submit();
    expect(JSON.parse(localStorage.getItem(MEMORY_KEY) as string).never).toBe(true);
  });

  it("rejects an obviously bad address without a network call", async () => {
    await open();
    type("not-an-email");
    await submit();
    expect(subscribeToBlog).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(SUBSCRIBE_INVALID_MESSAGE);
  });

  it("keeps the form and says so when the request fails, and does not remember it as an answer", async () => {
    subscribeToBlog.mockRejectedValueOnce(new Error("500"));
    await open();
    type("reader@example.com");
    await submit();
    expect(screen.getByRole("alert")).toHaveTextContent(SUBSCRIBE_ERROR_MESSAGE);
    expect(full().getByLabelText("Email address")).toBeInTheDocument();
    expect(localStorage.getItem(MEMORY_KEY)).toBeNull();
  });
});

describe("the contract with the page around it", () => {
  const read2 = (p: string) => readFileSync(p, "utf8");

  it("the layout mounts it for every post that has a slug, and marks the two nodes it watches", () => {
    const layout = read2("components/blog/BlogArticleLayout.tsx");
    expect(layout).toMatch(/<BlogReaderPrompt slug=\{slug\} \/>/);
    expect(layout).toContain("data-blog-article");
    expect(read2("components/blog/BlogSubscribe.tsx")).toContain("data-blog-subscribe");
  });

  it("is a bar below 1424px and a card above it, and drops its entrance under reduced motion", () => {
    const css = read2("app/globals.css");
    expect(css).toMatch(/@media \(min-width: 1424px\)\s*\{\s*\.bp \{/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.bp \{ animation: none; \}/);
    // In bar mode the content is a reading-width column, not edge to edge.
    expect(css).toMatch(/\.bp-rest, \.bp-full \{ max-width: 640px; margin-inline: auto; \}/);
    // Below every MUI modal (1300), so a dialog the reader opens covers it.
    expect(css).toMatch(/\.bp \{[^}]*z-index: 40;/);
  });
});
