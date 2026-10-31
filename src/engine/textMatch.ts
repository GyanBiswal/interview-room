import type { MatchConcept } from "./matchTypes";

// Lowercase, drop apostrophes, and turn every other symbol into a space.
// "Promise.all" -> "promise all", "doesn't" -> "doesnt", "O(n)" -> "o n".
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Whole-word phrase match. A trailing * allows any word ending ("validat*").
export function termMatches(paddedText: string, term: string): boolean {
  const wildcard = term.endsWith("*");
  const base = normalizeText(wildcard ? term.slice(0, -1) : term);
  if (!base) return false;
  return wildcard
    ? paddedText.includes(` ${base}`)
    : paddedText.includes(` ${base} `);
}

const patternCache = new Map<string, RegExp | null>();

export function getPattern(source: string): RegExp | null {
  if (patternCache.has(source)) return patternCache.get(source) ?? null;
  let compiled: RegExp | null = null;
  try {
    compiled = new RegExp(source);
  } catch {
    compiled = null;
  }
  patternCache.set(source, compiled);
  return compiled;
}

// Returns the first term or pattern that matches, or null.
export function findMatch(
  normalized: string,
  padded: string,
  concept: MatchConcept
): string | null {
  for (const term of concept.terms ?? []) {
    if (termMatches(padded, term)) return term;
  }
  for (const source of concept.patterns ?? []) {
    const re = getPattern(source);
    if (re && re.test(normalized)) return `pattern: ${source}`;
  }
  return null;
}
