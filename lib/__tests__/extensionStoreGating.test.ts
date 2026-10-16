import { describe, it, expect, vi, afterEach } from "vitest";

// IS_STORE_LIVE is read at module load, so each case re-imports with its env.
async function load(url: string | undefined) {
  vi.resetModules();
  if (url === undefined) delete process.env.NEXT_PUBLIC_CHROME_STORE_URL;
  else process.env.NEXT_PUBLIC_CHROME_STORE_URL = url;
  const sitemap = (await import("@/app/sitemap")).default;
  const page = await import("@/app/extension/page");
  return { urls: sitemap().map((e) => e.url), robots: page.metadata.robots };
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_CHROME_STORE_URL;
});

describe("extension page before and after the store listing exists", () => {
  it("is out of the sitemap and not indexed while unpublished", async () => {
    const { urls, robots } = await load(undefined);
    expect(urls.some((u) => u.endsWith("/extension/"))).toBe(false);
    expect(robots).toMatchObject({ index: false });
  });

  it("appears and is indexed once the store URL is set", async () => {
    const { urls, robots } = await load("https://chromewebstore.google.com/detail/resunova/abc");
    expect(urls.some((u) => u.endsWith("/extension/"))).toBe(true);
    expect(robots).toMatchObject({ index: true });
  });
});
