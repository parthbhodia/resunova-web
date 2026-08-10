import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // `lib/**` was missing, so lib/__tests__/sponsorJobs.test.ts never ran.
    include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    css: false,
    restoreMocks: true,
    // Vitest defaults to 5000ms. `userEvent`-driven tests pass alone in ~1-2s
    // and time out at 5000ms in the full run — 88 files sharing a machine,
    // with jsdom environment setup alone reporting several minutes across the
    // suite. That is the harness starving, not the components breaking, and it
    // made `npm test` fail intermittently — which matters because deploy.yml
    // gates the production Pages upload on this exact command.
    //
    // Raised globally rather than marking individual tests slow: any future
    // userEvent test hits the same wall, and a per-test timeout has to be
    // remembered every time. 20s still fails a genuinely hung test well inside
    // the CI budget.
    testTimeout: 20000,
  },
});
