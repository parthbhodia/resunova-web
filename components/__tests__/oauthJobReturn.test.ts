import { afterEach, describe, expect, it } from "vitest";
import { POST_LOGIN_DEST_KEY, getAppRelativeLocation, stashPostLoginDest } from "@/lib/oauthRedirect";

describe("job login return destination", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("preserves the exact selected job through OAuth", () => {
    window.history.replaceState({}, "", "/?view=jobs&job=job-123");

    expect(getAppRelativeLocation()).toBe("/?view=jobs&job=job-123");
    stashPostLoginDest();
    expect(window.localStorage.getItem(POST_LOGIN_DEST_KEY)).toBe("/?view=jobs&job=job-123");
  });
});
