import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TemplateGallery from "@/components/TemplateGallery";
import HomeTemplateStrip from "@/components/HomeTemplateStrip";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";

/**
 * The two surfaces that fix "users can't find the resume templates": the
 * /templates gallery and the Home shelf. Both render REAL preset thumbnails
 * and land in the builder with the preset applied — a card that opened the
 * builder unstyled would be the deep-link bug #107 already fixed, reborn.
 */

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/templates",
}));

beforeEach(() => push.mockClear());

describe("the /templates gallery", () => {
  it("renders one card per shipped preset", () => {
    render(<TemplateGallery />);
    expect(document.querySelectorAll("[data-template-card]")).toHaveLength(
      RESUME_STYLE_PRESETS.length,
    );
    for (const p of RESUME_STYLE_PRESETS) {
      expect(screen.getByText(p.label)).toBeInTheDocument();
    }
  });

  it("opens the builder with the card's own preset applied", () => {
    render(<TemplateGallery />);
    fireEvent.click(document.querySelector('[data-template-card="creative-teal"]')!);
    expect(push).toHaveBeenCalledWith("/template-builder/?preset=creative-teal");
  });

  it("cross-links to the written examples for the other meaning of templates", () => {
    // "Resume templates" also means example content to many users; the
    // gallery owns layouts and points at /resume-examples for the rest.
    render(<TemplateGallery />);
    expect(
      screen.getByRole("link", { name: /browse real resume examples/i }),
    ).toHaveAttribute("href", "/resume-examples/");
  });
});

describe("the Home template shelf", () => {
  it("shows every preset and opens the builder styled", () => {
    render(<HomeTemplateStrip />);
    fireEvent.click(screen.getByRole("button", { name: "Use the Harper template" }));
    expect(push).toHaveBeenCalledWith("/template-builder/?preset=creative-banner");
    expect(
      screen.getAllByRole("button", { name: /use the .* template/i }),
    ).toHaveLength(RESUME_STYLE_PRESETS.length);
  });

  it("leads to the full gallery", () => {
    render(<HomeTemplateStrip />);
    fireEvent.click(screen.getByRole("button", { name: /browse all templates/i }));
    expect(push).toHaveBeenCalledWith("/templates/");
  });
});
