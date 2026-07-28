"use client";

/**
 * Company Briefing — live web research for Interview Prep.
 *
 * Helps candidates become experts on the target company before interviews /
 * cover letters: overview, products, recent news, culture, talking points,
 * cover-letter hooks, and questions to ask.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Lightbulb,
  MessageSquareQuote,
  Newspaper,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiClient";

export interface CompanyBrief {
  company: string;
  tagline: string;
  overview: string;
  products: string[];
  recentHighlights: string[];
  cultureAndValues: string[];
  competitors: string[];
  talkingPoints: string[];
  coverLetterHooks: string[];
  questionsToAsk: string[];
  caution: string;
}

interface BriefSource {
  title: string;
  url: string;
}

interface CompanyBriefResponse {
  brief: CompanyBrief;
  sources: BriefSource[];
  queries?: string[];
  error?: string;
}

type PanelStatus = "idle" | "loading" | "ready" | "error";

interface Props {
  company: string;
  role: string;
  jobDescription: string;
}

const RESEARCH_MESSAGES = [
  "Searching public company sources…",
  "Reading products and recent news…",
  "Pulling culture and market signals…",
  "Drafting talking points and cover-letter hooks…",
];

function BulletSection({
  icon,
  title,
  items,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  accent?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className={cn("rounded-xl border p-3.5", accent ? "border-accent/25 bg-[var(--accent-bg)]" : "border-border/60 bg-muted/20")}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("flex size-6 items-center justify-center rounded-md", accent ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground")}>
          {icon}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        <Badge variant="outline" className="ml-auto text-[10px] tabular-nums">
          {items.length}
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-accent/70" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CompanyBriefingPanel({ company, role, jobDescription }: Props) {
  const companyKey = company.trim();
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [sources, setSources] = useState<BriefSource[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const cacheRef = useRef<Map<string, { brief: CompanyBrief; sources: BriefSource[] }>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status !== "loading") return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(
      () => setMsgIdx((i) => (i + 1) % RESEARCH_MESSAGES.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, [status]);

  const copyText = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600);
    } catch {
      /* clipboard may be denied */
    }
  }, []);

  const loadBrief = useCallback(
    async (force = false) => {
      const name = companyKey;
      if (!name) return;

      if (!force) {
        const cached = cacheRef.current.get(name.toLowerCase());
        if (cached) {
          setBrief(cached.brief);
          setSources(cached.sources);
          setStatus("ready");
          setError(null);
          setExpanded(true);
          return;
        }
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setStatus("loading");
      setError(null);
      setMsgIdx(0);
      setExpanded(true);

      try {
        const res = await apiFetch("/api/interview-prep/company-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: name,
            role: role || undefined,
            jobDescription: jobDescription || undefined,
          }),
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => ({}))) as CompanyBriefResponse & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || `Research failed (${res.status})`);
        }
        if (!data.brief) {
          throw new Error("Empty briefing returned");
        }
        cacheRef.current.set(name.toLowerCase(), {
          brief: data.brief,
          sources: data.sources || [],
        });
        setBrief(data.brief);
        setSources(data.sources || []);
        setStatus("ready");
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Could not research this company");
      }
    },
    [companyKey, role, jobDescription],
  );

  // Reset when company changes; keep prior brief until they research again.
  useEffect(() => {
    abortRef.current?.abort();
    const cached = companyKey
      ? cacheRef.current.get(companyKey.toLowerCase())
      : undefined;
    if (cached) {
      setBrief(cached.brief);
      setSources(cached.sources);
      setStatus("ready");
      setError(null);
    } else {
      setBrief(null);
      setSources([]);
      setStatus("idle");
      setError(null);
    }
  }, [companyKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!companyKey) {
    return (
      <Card className="rounded-2xl border-dashed border-border/80 bg-muted/10">
        <CardContent className="flex items-start gap-3 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Company research</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add a company on Step 1 to unlock a live briefing — products, recent news,
              culture signals, cover-letter hooks, and questions to ask.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hooksCopy = (brief?.coverLetterHooks || []).map((h) => `• ${h}`).join("\n");
  const talkingCopy = (brief?.talkingPoints || []).map((h) => `• ${h}`).join("\n");
  const questionsCopy = (brief?.questionsToAsk || []).map((h, i) => `${i + 1}. ${h}`).join("\n");

  return (
    <Card className="rounded-2xl border-accent/30 bg-[var(--accent-bg)]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base">
                Become an expert on {companyKey}
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live public research for interviews and cover letters — the digging that
                shows enthusiasm on paper and in the room.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {status === "ready" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" aria-hidden />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" aria-hidden />
                    Expand
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={status === "loading"}
              onClick={() => void loadBrief(status === "ready")}
            >
              {status === "loading" ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" aria-hidden />
                  Researching…
                </>
              ) : status === "ready" ? (
                <>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Refresh
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden />
                  Research {companyKey}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {status === "idle" && (
          <p className="rounded-xl border border-border/50 bg-background/50 px-3.5 py-3 text-sm text-muted-foreground">
            One click pulls public product, culture, and recent-news context you can drop
            into answers and your cover letter.
          </p>
        )}

        {status === "loading" && (
          <div role="status" aria-live="polite" className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-background/60 px-3.5 py-2.5 text-sm font-medium text-foreground">
              <RefreshCw className="size-3.5 shrink-0 animate-spin text-accent" aria-hidden />
              {RESEARCH_MESSAGES[msgIdx]}
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3"
          >
            <p className="text-sm text-destructive">{error || "Research failed"}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start gap-1.5"
              onClick={() => void loadBrief(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && brief && expanded && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {(brief.tagline || brief.overview) && (
              <div className="rounded-xl border border-border/60 bg-background/70 p-3.5">
                {brief.tagline ? (
                  <p className="text-sm font-semibold text-foreground">{brief.tagline}</p>
                ) : null}
                {brief.overview ? (
                  <p className={cn("text-sm leading-relaxed text-muted-foreground", brief.tagline && "mt-1.5")}>
                    {brief.overview}
                  </p>
                ) : null}
              </div>
            )}

            {brief.caution ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {brief.caution}
              </p>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <BulletSection
                icon={<Target className="size-3.5" aria-hidden />}
                title="Products"
                items={brief.products}
              />
              <BulletSection
                icon={<Newspaper className="size-3.5" aria-hidden />}
                title="Recent highlights"
                items={brief.recentHighlights}
              />
              <BulletSection
                icon={<Users className="size-3.5" aria-hidden />}
                title="Culture & values"
                items={brief.cultureAndValues}
              />
              <BulletSection
                icon={<Building2 className="size-3.5" aria-hidden />}
                title="Market / competitors"
                items={brief.competitors}
              />
            </div>

            <BulletSection
              icon={<Lightbulb className="size-3.5" aria-hidden />}
              title="Interview talking points"
              items={brief.talkingPoints}
              accent
            />
            <BulletSection
              icon={<PenLine className="size-3.5" aria-hidden />}
              title="Cover letter hooks"
              items={brief.coverLetterHooks}
              accent
            />
            <BulletSection
              icon={<MessageSquareQuote className="size-3.5" aria-hidden />}
              title="Questions to ask them"
              items={brief.questionsToAsk}
              accent
            />

            {(hooksCopy || talkingCopy || questionsCopy) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {hooksCopy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => void copyText("hooks", hooksCopy)}
                  >
                    {copiedKey === "hooks" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy cover-letter hooks
                  </Button>
                ) : null}
                {talkingCopy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => void copyText("talk", talkingCopy)}
                  >
                    {copiedKey === "talk" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy talking points
                  </Button>
                ) : null}
                {questionsCopy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => void copyText("ask", questionsCopy)}
                  >
                    {copiedKey === "ask" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy questions to ask
                  </Button>
                ) : null}
              </div>
            )}

            {sources.length > 0 && (
              <div className="border-t border-border/50 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources
                </p>
                <ul className="flex flex-col gap-1">
                  {sources.slice(0, 8).map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-xs text-accent hover:underline"
                      >
                        <span className="truncate">{s.title || s.url}</span>
                        <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
