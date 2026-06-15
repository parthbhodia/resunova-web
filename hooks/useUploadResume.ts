"use client";

import { useState, useCallback } from "react";
import {
  apiErrorFromUnknown,
  encodeResumeGateError,
  isEncodedResumeGateError,
  RESUME_GATE_CODES,
} from "@/lib/userFriendlyError";
import { mergeAnalyzeApiJson } from "@/lib/mergeAnalyzeApiJson";
import { apiUrl, parseJsonOrThrow, MAX_RESUME_UPLOAD_BYTES } from "@/lib/utils";
import type { StructuredResume } from "@/store/resumeAnalyzeStore";

export interface UploadResumeResult {
  /** Builder-friendly plain text (prefers vision-synthesized extract when available). */
  text: string;
  /** Clean synthesized preview text — same source Analyze uses for WYSIWYG preview. */
  extractedText: string;
  /** Candidate name/contact lines detected by the backend. */
  resumeHeader: string[];
  /** Original filename as returned by the backend. */
  filename?: string;
  /** Structured resume JSON produced by the backend extraction pipeline. */
  structuredResume: StructuredResume | null;
}

export interface UseUploadResumeReturn {
  upload: (file: File, jd?: string) => Promise<UploadResumeResult>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Shared hook for /api/upload-resume — used by ResumeBuilder,
 * ContentSourcePicker, and ProfilePage. Eliminates duplicate fetch() calls.
 */
export function useUploadResume(): UseUploadResumeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, jd = ""): Promise<UploadResumeResult> => {
    // Instant client-side guards — fail before any network round-trip.
    if (!file || !file.size) {
      const msg = "This file is empty (0 bytes). Please choose your résumé file and try again.";
      setError(msg);
      throw new Error(msg);
    }
    if (file.size > MAX_RESUME_UPLOAD_BYTES) {
      const msg = `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — over the 4 MB limit. Compress images or export a smaller PDF, then try again.`;
      setError(msg);
      throw new Error(msg);
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (jd.trim()) fd.append("jd", jd.trim());

      const resp = await fetch(apiUrl("/api/upload-resume"), { method: "POST", body: fd });
      const raw = await parseJsonOrThrow<Record<string, unknown>>(resp);
      const json = mergeAnalyzeApiJson(raw) as {
        error?: string;
        text?: string;
        extractedText?: string;
        resumeHeader?: string[];
        filename?: string;
        structuredResume?: StructuredResume | null;
        structured?: StructuredResume | null;
      };

      if (!resp.ok) {
        const code = typeof raw.code === "string" ? raw.code : "";
        const message = typeof raw.error === "string" ? raw.error : "Could not extract text from your PDF.";
        // Content gate (422): carry the code/missing so the UI shows the calm
        // "invalid résumé" banner instead of a generic server error.
        if (RESUME_GATE_CODES.has(code)) {
          const missing = Array.isArray(raw.missing) ? (raw.missing as string[]) : [];
          throw new Error(encodeResumeGateError(code, message, missing));
        }
        throw new Error(message);
      }

      const extracted =
        (typeof json.extractedText === "string" && json.extractedText.trim())
        || (typeof json.text === "string" && json.text.trim())
        || "";
      const structured =
        json.structuredResume ?? json.structured ?? null;

      return {
        text: extracted,
        extractedText: extracted,
        resumeHeader: Array.isArray(json.resumeHeader)
          ? json.resumeHeader.filter((x): x is string => typeof x === "string")
          : [],
        filename: typeof json.filename === "string" ? json.filename : undefined,
        structuredResume: structured,
      };
    } catch (e: unknown) {
      const rawMsg = e instanceof Error ? e.message : String(e);
      // Preserve the encoded gate payload so the renderer can show the calm
      // banner; flatten everything else into friendly copy.
      const msg = isEncodedResumeGateError(rawMsg) ? rawMsg : apiErrorFromUnknown(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { upload, loading, error, clearError };
}
