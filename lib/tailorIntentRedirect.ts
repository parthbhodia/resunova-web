/**
 * Once the `intent=job` prefill effect in ResumeBuilder has consumed its
 * sessionStorage payload, it strips `intent` from the URL via router.replace.
 * That replace must land on whichever route mounted ResumeBuilder — classic
 * "/" or the "/tailor-2" redesign — not a route hardcoded to root, which has
 * no `view` param and so falls back to the Home dashboard.
 */
export function resolveIntentJobRedirect(
  pathname: string | null | undefined,
  params: URLSearchParams,
): string {
  const sp = new URLSearchParams(params);
  sp.delete("intent");
  const qs = sp.toString();
  const here = (pathname || "/").replace(/\/$/, "") || "/";
  const isRoot = here === "/";
  const fallbackQs = isRoot ? "view=builder&flow=tailor" : "flow=tailor";
  return qs ? `${here}?${qs}` : `${here}?${fallbackQs}`;
}
