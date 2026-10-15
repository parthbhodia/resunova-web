import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TemplateGallery from "@/components/TemplateGallery";
import HomeTemplateStrip from "@/components/HomeTemplateStrip";
import { RESUME_STYLE_PRESETS } from "@/lib/resumeLayout";
import { ATS_GUIDE_FORMAT_CHECKLIST, RESEARCH_QUICK_CHECKLIST } from "@/lib/atsBestPracticesContent";

/**
 * The two surfaces that fix "users can't find the resume templates": the
 * /templates gallery and the Home shelf. Both render REAL preset thumbnails
 * and land in the builder with the preset applied — a card that opened the
 * builder unstyled would be the deep-link bug #107 already fixed, reborn.
 *
 * Both now LEAD with the preset's role fit (founder: "instead of classic
 * templates give them option for software roles, etc"). The style name stays
 * on the card, because it is what the builder's Style panel calls the same
 * thing and dropping it makes a template you picked once unfindable.
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

  it("leads each card with the role it suits, not the style name", () => {
    render(<TemplateGallery />);
    const headings = [...document.querySelectorAll("[data-template-bestfor]")].map(
      (el) => el.textContent,
    );
    expect(headings).toEqual(RESUME_STYLE_PRESETS.map((p) => p.bestFor));
    // The style name survives as the secondary label, so someone who picked
    // "Elise" once can find her again.
    expect(screen.getByText("Elise")).toBeInTheDocument();
  });

  it("says the fit is guidance, so no role is locked out of a template", () => {
    // The presets differ in typography and layout only. Five role labels with
    // nothing qualifying them read as five different products.
    render(<TemplateGallery />);
    expect(screen.getByText(/any template works for any role/i)).toBeInTheDocument();
  });

  it("names both the template and its fit for a screen reader", () => {
    render(<TemplateGallery />);
    // The visible heading is now the role, so the card's accessible name has
    // to carry the style name or it is unreachable by name.
    expect(
      screen.getByRole("button", { name: /Elise template, best for Design & creative/i }),
    ).toBeInTheDocument();
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

  it("answers the query the page targets instead of only showing cards", () => {
    // The page was targeting "ats-friendly resume templates" with three
    // sentences of prose and no answer. The traits are pulled by id from the
    // shared ATS checklists, so this is guidance the in-app and blog surfaces
    // already make rather than a second copy written here.
    render(<TemplateGallery />);
    for (const id of ["single_column", "standard_headers", "standard_fonts", "no_decorative"]) {
      const item = [ ...ATS_GUIDE_FORMAT_CHECKLIST, ...RESEARCH_QUICK_CHECKLIST ].find((i) => i.id === id);
      expect(item, `${id} should live in a shared checklist`).toBeDefined();
      expect(screen.getByText(item!.text)).toBeInTheDocument();
    }
  });

  it("names the sidebar looks and says where they cost you", () => {
    // Both creative presets carry an enforcedLayout. Claiming all five are
    // equally parse-friendly is the kind of quiet overclaim that makes the
    // rest of the site's measured honesty read as marketing.
    render(<TemplateGallery />);
    const sidebar = RESUME_STYLE_PRESETS.filter((p) => p.enforcedLayout);
    const single = RESUME_STYLE_PRESETS.filter((p) => !p.enforcedLayout);
    expect(sidebar.length).toBeGreaterThan(0);

    expect(screen.getByRole("heading", { name: new RegExp(sidebar.map((p) => p.label).join("|")) })).toBeInTheDocument();
    expect(screen.getByText(/single-column layouts above is the safer pick/i)).toBeInTheDocument();
    expect(single.length).toBeGreaterThan(0);
  });

  it("links into the content cluster that covers the same subject in depth", () => {
    // Teal's 3M job pages diluted its resume authority because nothing joined
    // the two. These links are the bridge, and they are pinned so a copy edit
    // cannot quietly orphan the page again.
    render(<TemplateGallery />);
    for (const [href, label] of [
      ["/blog/how-ats-really-works/", "How ATS Really Works"],
      ["/blog/optimizing-resumes-for-ats/", "Optimizing Résumés"],
      ["/blog/tailor-resume-to-job-description/", "How to Tailor Your Resume"],
    ] as const) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
    }
  });
});

describe("the Home template shelf", () => {
  it("shows every preset and opens the builder styled", () => {
    render(<HomeTemplateStrip />);
    fireEvent.click(
      screen.getByRole("button", { name: "Use the Harper template, best for Data & analytics" }),
    );
    expect(push).toHaveBeenCalledWith("/template-builder/?preset=creative-banner");
    expect(
      screen.getAllByRole("button", { name: /use the .* template/i }),
    ).toHaveLength(RESUME_STYLE_PRESETS.length);
  });

  it("leads with the role and keeps the name underneath", () => {
    render(<HomeTemplateStrip />);
    for (const p of RESUME_STYLE_PRESETS) {
      expect(screen.getByText(p.bestFor)).toBeInTheDocument();
      expect(screen.getByText(p.label)).toBeInTheDocument();
    }
  });

  it("leads to the full gallery", () => {
    render(<HomeTemplateStrip />);
    fireEvent.click(screen.getByRole("button", { name: /browse all templates/i }));
    expect(push).toHaveBeenCalledWith("/templates/");
  });
});
