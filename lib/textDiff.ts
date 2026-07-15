export type DiffTok = { type: "same" | "add" | "del"; text: string };

/**
 * Word-level diff via a standard LCS pass over tokens (words + whitespace).
 * Bullets are short (rarely >50 tokens) so O(n*m) is fine.
 */
export function diffWords(before: string, after: string): DiffTok[] {
  const tok = (s: string) => s.match(/\s+|[^\s]+/g) ?? [];
  const a = tok(before);
  const b = tok(after);
  const n = a.length, m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffTok[] = [];
  let i = 0, j = 0;
  const push = (type: DiffTok["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  while (i < n && j < m) {
    if (a[i] === b[j])                     { push("same", a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", a[i]);  i++; }
    else                                   { push("add", b[j]);  j++; }
  }
  while (i < n) { push("del", a[i++]); }
  while (j < m) { push("add", b[j++]); }
  return out;
}
