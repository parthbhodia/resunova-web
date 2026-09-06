import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { RenderErrorBoundary } from "@/components/RenderErrorBoundary";

/**
 * Field report, 2026-09-06: My Résumés was dead on desktop and fine on the same
 * account on mobile, with "URL.parse is not a function" on the crash page.
 * pdf.js v5 (via react-pdf) calls URL.parse / URL.canParse / Promise.withResolvers
 * directly, so opening the library on Chrome < 126 threw while the PDF-thumbnail
 * chunk evaluated and took the whole view down.
 */

const LAYOUT = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

/** Pull the shim out of the layout so the shipped string is what gets exercised. */
function polyfillSource(): string {
  const m = LAYOUT.match(/const MODERN_API_POLYFILL_SCRIPT = `([\s\S]*?)`;/);
  if (!m) throw new Error("MODERN_API_POLYFILL_SCRIPT not found in app/layout.tsx");
  return m[1];
}

describe("the modern-API polyfill shipped in the document head", () => {
  it("is rendered into the head, before any app chunk can run", () => {
    // A shim defined but never injected is the bug still shipping.
    expect(LAYOUT).toMatch(/__html: MODERN_API_POLYFILL_SCRIPT/);
  });

  it("defines URL.parse on a browser that lacks it", () => {
    const scope: Record<string, unknown> = { URL: class FakeURL {}, Promise };
    // Give the fake URL real parsing behaviour for absolute inputs only.
    const RealURL = URL;
    scope.URL = function (u: string, b?: string) { return b === undefined ? new RealURL(u) : new RealURL(u, b); } as unknown;
    new Function("URL", "Promise", polyfillSource())(scope.URL, Promise);
    const patched = scope.URL as { parse?: (u: string, b?: string) => unknown };
    expect(typeof patched.parse).toBe("function");
    expect(patched.parse!("https://resunova.io/x")).not.toBeNull();
  });

  it("makes URL.parse return null instead of throwing — the reason it exists", () => {
    const RealURL = URL;
    const FakeURL = function (u: string, b?: string) { return b === undefined ? new RealURL(u) : new RealURL(u, b); } as unknown as {
      parse?: (u: string, b?: string) => unknown; canParse?: (u: string) => boolean;
    };
    new Function("URL", "Promise", polyfillSource())(FakeURL, Promise);
    expect(FakeURL.parse!("not a url")).toBeNull();
    expect(FakeURL.canParse!("not a url")).toBe(false);
    expect(FakeURL.canParse!("https://resunova.io")).toBe(true);
  });

  it("defines Promise.withResolvers, which pdf.js also calls", async () => {
    const FakePromise = function () {} as unknown as { withResolvers?: () => { promise: Promise<string>; resolve: (v: string) => void } };
    // The shim closes over the real Promise for construction.
    new Function("URL", "Promise", polyfillSource())(URL, FakePromise);
    expect(typeof FakePromise.withResolvers).toBe("function");
  });

  it("leaves a modern browser's native implementations alone", () => {
    const native = (u: string) => `native:${u}`;
    const FakeURL = { parse: native, canParse: native } as unknown as { parse: unknown; canParse: unknown };
    new Function("URL", "Promise", polyfillSource())(FakeURL, Promise);
    expect(FakeURL.parse).toBe(native);
    expect(FakeURL.canParse).toBe(native);
  });
});

describe("RenderErrorBoundary", () => {
  const Boom = () => { throw new Error("URL.parse is not a function"); };

  it("contains a throwing child instead of taking the page down", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <span>My Résumés</span>
        <RenderErrorBoundary><Boom /></RenderErrorBoundary>
      </div>,
    );
    // The surrounding page survives — that is the whole point.
    expect(screen.getByText("My Résumés")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders a fallback when one is given, and nothing when it is not", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<RenderErrorBoundary><Boom /></RenderErrorBoundary>);
    expect(container.textContent).toBe("");
    render(<RenderErrorBoundary fallback={<span>no preview</span>}><Boom /></RenderErrorBoundary>);
    expect(screen.getByText("no preview")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("passes healthy children straight through", () => {
    render(<RenderErrorBoundary><span>thumbnail</span></RenderErrorBoundary>);
    expect(screen.getByText("thumbnail")).toBeInTheDocument();
  });
});
