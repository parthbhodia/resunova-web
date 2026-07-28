"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [authStatus, setAuthStatus] = useState<"loading" | "ready" | "invalid">("loading");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    const auth = getSupabaseClient().auth;
    auth.getSession().then(({ data }) => {
      if (active) setAuthStatus(data.session ? "ready" : "invalid");
    });
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (active && (event === "PASSWORD_RECOVERY" || session)) setAuthStatus("ready");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setComplete(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Resunova account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {complete ? "Password updated" : "Choose a new password"}
        </h1>

        {complete ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your password has been changed. You can return to Resunova and continue working.
            </p>
            <Button className="w-full" render={<Link href="/" />}>Return to Resunova</Button>
          </div>
        ) : authStatus === "loading" ? (
          <p className="mt-5 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : authStatus === "ready" ? (
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block space-y-1.5 text-sm font-medium">
              New password
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              Confirm password
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </label>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              This reset link is invalid or has expired. Request a new link from the sign-in window.
            </p>
            <Button variant="outline" className="w-full" render={<Link href="/" />}>Return home</Button>
          </div>
        )}
      </section>
    </main>
  );
}
