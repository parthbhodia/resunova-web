"use client";

import { useEffect } from "react";
import { canonicalizeHostIfNeeded } from "@/lib/oauthRedirect";

/** Client-side fallback if the inline layout script did not run. */
export default function AuthHostRedirect() {
  useEffect(() => {
    canonicalizeHostIfNeeded();
  }, []);
  return null;
}
