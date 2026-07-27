"use client";
/**
 * Scoped MUI provider.
 *
 * Deliberately NOT mounted in the root layout. Emotion injects styles at
 * runtime, and this app is a static export of ~1,076 prerendered pages — only
 * the surfaces that actually use MUI should pay for that. Mounting it here,
 * around one subtree, also keeps the blast radius of adopting a second design
 * system to the subtree that opted in.
 *
 * `CssBaseline` is intentionally absent for the same reason: it is a global
 * reset, and this app already has one in globals.css. Applying MUI's on top
 * would restyle every surface underneath — including the résumé paper, whose
 * metrics drive Chromium PDF pagination.
 *
 * The app switches themes by setting `data-theme` on <html>; MUI needs a
 * literal palette (see theme.ts), so this observes that attribute and swaps
 * the theme object rather than trying to read CSS variables.
 */
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { makeTheme, type ThemeMode } from "./theme";

/**
 * `data-theme` on <html> is an external store, so it is read with
 * useSyncExternalStore rather than mirrored into state and re-synced from an
 * effect. The effect version needed a setState on mount to correct the value
 * it could not read during the server pass — which is a cascading render, and
 * the repo's lint ratchet rejects it (react-hooks/set-state-in-effect).
 * useSyncExternalStore has a server snapshot for exactly this case.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getSnapshot = (): ThemeMode =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

/** Prerender has no document; the app's own default is dark. */
const getServerSnapshot = (): ThemeMode => "dark";

export default function MuiThemeRegistry({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = useMemo(() => makeTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider options={{ key: "mui", enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
