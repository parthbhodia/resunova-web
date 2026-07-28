"use client";

/**
 * Google One Tap — auto-prompt (top-right) sign-in for signed-out visitors.
 *
 * Fully gated on NEXT_PUBLIC_GOOGLE_CLIENT_ID: when the env var is unset this
 * component renders nothing and never loads Google's script, so it is a safe
 * no-op until the Google Cloud "Web" OAuth client is configured (client_id +
 * Authorized JavaScript origins) AND the same client_id is registered in the
 * Supabase Google provider.
 *
 * Unlike the existing redirect OAuth flow (lib/anonScan.signInWithGoogle), One
 * Tap is a pure client-side ID-token exchange — no server callback, no host
 * canonicalization dance — which is a better fit for the static
 * (output: "export") GitHub Pages build. On success supabase-js emits the same
 * SIGNED_IN event the redirect flow does, so AppShell/AuthGate handle routing.
 *
 * Nonce: Google is given the SHA-256 hash of a random nonce; Supabase is given
 * the RAW nonce (supabase-js re-hashes and compares) — this binds the returned
 * ID token to this attempt.
 */

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GSI_SRC = "https://accounts.google.com/gsi/client";

interface CredentialResponse {
  credential?: string;
}
interface GoogleIdApi {
  initialize(cfg: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadGsi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gsi load error")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi load error"));
    document.head.appendChild(s);
  });
}

export default function GoogleOneTap() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID) return; // not configured → no-op
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const supabase = getSupabaseClient();

    (async () => {
      // Only prompt signed-out visitors.
      const { data } = await supabase.auth.getSession();
      if (cancelled || data.session) return;

      const rawNonce = crypto.randomUUID();
      const hashedNonce = await sha256Hex(rawNonce);

      try {
        await loadGsi();
      } catch {
        return;
      }
      const idApi = window.google?.accounts?.id;
      if (cancelled || !idApi) return;

      idApi.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: CredentialResponse) => {
          if (!resp.credential) return;
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: resp.credential,
            nonce: rawNonce,
          });
          if (error) {
            // Non-fatal: the redirect "Sign in with Google" button still works.
            console.warn("Google One Tap sign-in failed:", error.message);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true, // Chrome FedCM migration
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      if (!cancelled) idApi.prompt(); // renders top-right by default
    })();

    // If the user signs in another way, dismiss any open prompt.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) window.google?.accounts?.id?.cancel();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
