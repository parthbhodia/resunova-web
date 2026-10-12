/**
 * Report a root UI crash to the API. The crash page is a static export, so
 * this is the only way a browser failure reaches us while the API is healthy.
 * Never throws: a failed report must not replace the crash screen.
 */
import { apiFetch } from "@/lib/apiClient";

export async function reportUiCrash(error: { message?: string; digest?: string }): Promise<void> {
  try {
    const message = (error.message || "").trim();
    const digest = (error.digest || "").trim();
    const fingerprint = (digest || message || "unknown").slice(0, 160);
    const storageKey = `rn_ui_crash:${fingerprint}`;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    }
    const page = typeof location !== "undefined"
      ? `${location.origin}${location.pathname}${location.search}`.slice(0, 500)
      : "";
    const description = [message, digest && `digest ${digest}`].filter(Boolean).join("\n").slice(0, 2000);
    await apiFetch("/api/bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "UI crash",
        category: "ui_crash",
        description: description || "The page crashed with no error text.",
        page_url: page || undefined,
      }),
    });
  } catch {
    /* the crash screen still has to render */
  }
}
