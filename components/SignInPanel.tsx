"use client";

/**
 * The sign-in / create-account modal body, in MUI.
 *
 * Loaded lazily by SignInDialogProvider (see SignInDialog.tsx) and only after
 * someone first opens it. The provider lives in the root layout, so importing
 * MUI there would put Emotion on every one of the ~1,076 prerendered pages;
 * this way only a visitor who actually reaches for "Sign in" pays for it.
 *
 * Order is deliberate: Google first, because it is one tap and most accounts
 * use it, then email. The mode lives in the heading and a single switch link
 * at the foot, rather than a segmented control competing with the form.
 */

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import MuiThemeRegistry from "@/components/mui/MuiThemeRegistry";
import { fieldSx, filledButtonSx, outlineButtonSx } from "@/components/mui/cssVars";
import { signInWithGoogle } from "@/lib/anonScan";
import { sendPasswordReset, signInWithEmail, signUpWithEmail } from "@/lib/emailAuth";
import { FS, FW, LH } from "@/lib/typography";
import type { SignInDialogOptions } from "@/components/SignInDialog";

type Sx = SystemStyleObject<Theme>;
type EmailMode = "sign-in" | "sign-up" | "forgot";

const LOGO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon-192.png`;

const HEADINGS: Record<EmailMode, string> = {
  "sign-in": "Sign in to Resunova",
  "sign-up": "Create your free account",
  forgot: "Reset your password",
};

const DEFAULT_REASONS: Record<EmailMode, string> = {
  "sign-in": "Pick up your résumés, scores and saved jobs where you left them.",
  "sign-up": "Score your résumé against any job in 60 seconds. Free to start.",
  forgot: "Enter your email and we'll send you a link to choose a new password.",
};

const SUBMIT_LABELS: Record<EmailMode, string> = {
  "sign-in": "Sign in",
  "sign-up": "Create account",
  forgot: "Send reset link",
};

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.3 5.3C41.4 36.2 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const paperSx: Sx = {
  width: "100%",
  maxWidth: 420,
  m: 2,
  bgcolor: "var(--surface)",
  color: "var(--text)",
  backgroundImage: "none",
  borderRadius: "var(--md-shape-xl)",
  boxShadow: "var(--md-elevation-3)",
};

const bigButtonSx: Sx = { minHeight: 48, fontSize: FS.bodyLg, borderRadius: "var(--md-shape-md)" };

const textLinkSx: Sx = {
  color: "var(--accent)",
  fontSize: FS.body,
  fontWeight: FW.semibold,
  verticalAlign: "baseline",
};

const successAlertSx: Sx = {
  bgcolor: "var(--green-bg)",
  color: "var(--green-ink)",
  borderRadius: "var(--md-shape-md)",
  fontSize: FS.body,
  lineHeight: LH.snug,
  "& .MuiAlert-icon": { color: "var(--green-ink)" },
};

const errorAlertSx: Sx = {
  bgcolor: "var(--red-bg)",
  color: "var(--red-ink)",
  borderRadius: "var(--md-shape-md)",
  fontSize: FS.body,
  lineHeight: LH.snug,
  "& .MuiAlert-icon": { color: "var(--red-ink)" },
};

export default function SignInPanel({
  open,
  onClose,
  opts,
}: {
  open: boolean;
  onClose: () => void;
  opts: SignInDialogOptions;
}) {
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [mode, setMode] = useState<EmailMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const heading = mode === "sign-in" && opts.title ? opts.title : HEADINGS[mode];
  const reason = mode !== "forgot" && opts.reason ? opts.reason : DEFAULT_REASONS[mode];

  const selectMode = (next: EmailMode) => {
    setMode(next);
    setPassword("");
    setError(null);
    setNotice(null);
  };

  const handleGoogle = async () => {
    setBusy("google");
    setError(null);
    // Redirect navigates away on success; only reachable again on error.
    const err = await signInWithGoogle();
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode !== "forgot" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setBusy("email");
    if (mode === "forgot") {
      const resetError = await sendPasswordReset(email);
      setBusy(null);
      if (resetError) setError(resetError);
      else setNotice(`We sent a reset link to ${email.trim()}. It expires in 24 hours.`);
      return;
    }

    if (mode === "sign-up") {
      const result = await signUpWithEmail(email, password);
      setBusy(null);
      if (result.error) setError(result.error);
      else if (result.alreadyRegistered) {
        setMode("sign-in");
        setPassword("");
        setNotice(
          `You already have an account with ${email.trim()}. We emailed you a sign-in link, so tap it and you're in. If you first joined with Google, use Continue with Google.`,
        );
      } else if (result.needsConfirmation) {
        setNotice(
          `We sent a link to ${email.trim()}. Tap it to finish creating your account and you'll land right back here, signed in.`,
        );
      } else {
        onClose();
      }
      return;
    }

    const signInError = await signInWithEmail(email, password);
    setBusy(null);
    if (signInError) setError(signInError);
    else onClose();
  };

  return (
    <MuiThemeRegistry>
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="sign-in-heading"
        aria-describedby="sign-in-reason"
        slotProps={{ paper: { sx: paperSx } }}
      >
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8, color: "var(--muted)" }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ px: { xs: 3, sm: 4 }, pt: 4, pb: 3 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized */}
            <img
              src={LOGO_SRC}
              alt="Resunova"
              width={48}
              height={48}
              style={{ display: "block", margin: "0 auto 16px", borderRadius: 12 }}
            />
            <Typography
              id="sign-in-heading"
              component="h2"
              sx={{ fontSize: FS.h2, fontWeight: FW.bold, lineHeight: LH.tight, letterSpacing: "-0.01em", color: "var(--text)", textWrap: "balance" }}
            >
              {heading}
            </Typography>
            <Typography
              id="sign-in-reason"
              sx={{ mt: 1, fontSize: FS.bodyLg, lineHeight: LH.normal, color: "var(--muted)", textWrap: "pretty" }}
            >
              {reason}
            </Typography>
          </Box>

          {mode !== "forgot" && (
            <>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => void handleGoogle()}
                disabled={busy !== null}
                loading={busy === "google"}
                startIcon={<GoogleGlyph />}
                sx={{ ...outlineButtonSx, ...bigButtonSx, bgcolor: "var(--surface)" }}
              >
                Continue with Google
              </Button>

              <Divider sx={{ my: 2.5, color: "var(--dim)", fontSize: FS.small, "&::before, &::after": { borderColor: "var(--border)" } }}>
                or use email
              </Divider>
            </>
          )}

          <Box component="form" noValidate={false} onSubmit={(e: FormEvent<HTMLFormElement>) => void handleEmail(e)} sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy !== null}
              required
              fullWidth
              sx={fieldSx}
            />

            {mode !== "forgot" && (
              <Box>
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  helperText={mode === "sign-up" ? "At least 8 characters" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy !== null}
                  required
                  fullWidth
                  sx={{ ...fieldSx, "& .MuiFormHelperText-root": { color: "var(--dim)", fontSize: FS.small, mx: 0 } }}
                  slotProps={{
                    htmlInput: { minLength: 8 },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((v) => !v)}
                            sx={{ color: "var(--muted)" }}
                          >
                            <EyeIcon off={showPassword} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {mode === "sign-in" && (
                  <Box sx={{ textAlign: "right", mt: 0.5 }}>
                    <Link component="button" type="button" underline="hover" onClick={() => selectMode("forgot")} sx={{ ...textLinkSx, fontWeight: FW.medium, minHeight: 32 }}>
                      Forgot password?
                    </Link>
                  </Box>
                )}
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={errorAlertSx}>
                {error}
              </Alert>
            )}
            {notice && (
              <Alert severity="success" role="status" sx={successAlertSx}>
                {notice}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={busy !== null}
              loading={busy === "email"}
              sx={{ ...filledButtonSx, ...bigButtonSx }}
            >
              {SUBMIT_LABELS[mode]}
            </Button>
          </Box>

          <Typography sx={{ mt: 3, textAlign: "center", fontSize: FS.body, color: "var(--muted)" }}>
            {mode === "sign-in" ? "New to Resunova? " : mode === "sign-up" ? "Already have an account? " : "Remembered it? "}
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => selectMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              sx={textLinkSx}
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </Link>
          </Typography>
        </Box>

        <Box sx={{ px: { xs: 3, sm: 4 }, py: 2, borderTop: "1px solid var(--border)", textAlign: "center" }}>
          <Typography sx={{ fontSize: FS.small, lineHeight: LH.snug, color: "var(--dim)" }}>
            By continuing you agree to our{" "}
            <Link href="/terms" sx={{ color: "inherit", textDecorationColor: "currentColor" }}>Terms</Link> and{" "}
            <Link href="/privacy" sx={{ color: "inherit", textDecorationColor: "currentColor" }}>Privacy Policy</Link>.
          </Typography>
        </Box>
      </Dialog>
    </MuiThemeRegistry>
  );
}
