import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom implements neither of these on Element. Components that scroll a
// selection into view call them from inside a setTimeout, so a missing method
// throws after the test body has already resolved — an unattributable failure.
for (const method of ["scrollIntoView", "scrollTo"] as const) {
  if (typeof Element.prototype[method] !== "function") {
    Element.prototype[method] = () => {};
  }
}

// Unmount React trees and clear the jsdom DOM between tests.
afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    /* jsdom always provides localStorage; guard for safety */
  }
});
