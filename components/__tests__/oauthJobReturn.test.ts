import { afterEach, describe, expect, it } from "vitest";
import {
  POST_LOGIN_DEST_KEY,
  clearPostLoginDest,
  getAppRelativeLocation,
  shouldRestorePostLoginDest,
  stashPostLoginDest,
  takePostLoginDest,
} from "@/lib/oauthRedirect";

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

  it("restores /refer only from a stripped bare home landing", () => {
    expect(shouldRestorePostLoginDest("/", "/refer/?s=abc")).toBe(true);
    expect(shouldRestorePostLoginDest("/?view=analyze", "/refer/?s=abc")).toBe(false);
    expect(shouldRestorePostLoginDest("/refer/?s=abc", "/refer/?s=abc")).toBe(false);
    expect(shouldRestorePostLoginDest("/refer/", "/refer/?s=abc")).toBe(false);
  });

  it("takePostLoginDest is one-shot", () => {
    window.localStorage.setItem(POST_LOGIN_DEST_KEY, "/refer/");
    expect(takePostLoginDest()).toBe("/refer/");
    expect(takePostLoginDest()).toBeNull();
    clearPostLoginDest();
  });
});
