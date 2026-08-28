const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .trim();
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "que",
  "y", "o", "a", "con", "sin", "en", "por", "para", "es", "esta", "esto",
  "tiene", "tienen", "hay", "me", "te", "se", "lo", "al", "mas",
]);

export function tokenize(input: string): string[] {
  return normalize(input)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Cheap Levenshtein distance, good enough for short product-name fuzzy matching. */
export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Fuzzy substring/similarity score in [0,1], 1 = best match. */
export function similarity(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (t.includes(q) || q.includes(t)) return 1;
  const dist = levenshtein(q, t);
  return 1 - dist / Math.max(q.length, t.length);
}
