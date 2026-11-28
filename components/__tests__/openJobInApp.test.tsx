import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ value: null as boolean | null }));
const flag = vi.hoisted(() => ({ on: true }));
const goTo = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useReaderSignedIn", () => ({ useReaderSignedIn: () => session.value }));
vi.mock("@/lib/featureFlags", () => ({
  get JOBS_ENABLED() {
    return flag.on;
  },
}));
vi.mock("@/lib/navigate", () => ({ goTo }));

import OpenJobInApp from "@/components/seo/OpenJobInApp";

const ID = "9b1c0d2e-aaaa-bbbb-cccc-123456789abc";

function visit(search = "") {
  window.history.replaceState({}, "", `/jobs/${ID}/${search}`);
}

describe("OpenJobInApp", () => {
  beforeEach(() => {
    session.value = null;
    flag.on = true;
    goTo.mockClear();
    visit();
  });

  it("sends a signed-in visitor to the job inside the app", () => {
    session.value = true;
    render(<OpenJobInApp id={ID} />);
    expect(goTo).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith(`/?view=jobs&job=${ID}`);
  });

  it("leaves a guest on the public page", () => {
    session.value = false;
    render(<OpenJobInApp id={ID} />);
    expect(goTo).not.toHaveBeenCalled();
  });

  it("does nothing until the session is known", () => {
    session.value = null;
    render(<OpenJobInApp id={ID} />);
    expect(goTo).not.toHaveBeenCalled();
  });

  it("stays put when the in-app Jobs section is off, because that link would only show Home", () => {
    session.value = true;
    flag.on = false;
    render(<OpenJobInApp id={ID} />);
    expect(goTo).not.toHaveBeenCalled();
  });

  it("lets a signed-in person keep the public page with ?public=1", () => {
    session.value = true;
    visit("?public=1");
    render(<OpenJobInApp id={ID} />);
    expect(goTo).not.toHaveBeenCalled();
  });

  it("is mounted on the public job page, for the posting being shown", () => {
    const src = readFileSync("app/(marketing)/jobs/[id]/page.tsx", "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(src).toContain("<OpenJobInApp id={job.id} />");
  });
});
