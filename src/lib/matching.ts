import type { ProviderSearchResult } from '@/lib/providers/types';

const EDITION_KEYWORDS = ['(colored)', '(full color)', '(digital)', '(official)'];

function normalizeRomanization(s: string): string {
  return s
    .replace(/\bwo\b/g, 'o') // particle を
    .replace(/ou/g, 'o') // long vowel おう → お
    .replace(/uu/g, 'u') // long vowel うう → う
    .replace(/[''`]/g, '') // apostrophes
    .replace(/[–—]/g, '-') // dashes
    .replace(/\s+/g, ' ');
}

function levenshteinSimilarity(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matrix: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - matrix[la][lb] / Math.max(la, lb);
}

function titleScore(qLower: string, rLower: string): number {
  if (qLower === rLower) return 50;
  if (rLower.includes(qLower) || qLower.includes(rLower)) return 30;

  const sim = levenshteinSimilarity(qLower, rLower);
  if (sim > 0.8) return 20;

  const shorter = qLower.length <= rLower.length ? qLower : rLower;
  const longer = qLower.length <= rLower.length ? rLower : qLower;
  const prefixSim = levenshteinSimilarity(shorter, longer.substring(0, shorter.length));
  if (prefixSim > 0.85) return 30;

  return 0;
}

export function scoreMatch(
  query: string,
  result: ProviderSearchResult,
  reference: { lastChapter?: string | null; status?: string }
): number {
  let score = 0;
  const qRaw = query.toLowerCase().trim();
  const rRaw = result.title.toLowerCase().trim();

  const qNorm = normalizeRomanization(qRaw);
  const rNorm = normalizeRomanization(rRaw);

  score += Math.max(titleScore(qRaw, rRaw), titleScore(qNorm, rNorm));

  if (reference.lastChapter && result.chapterCount) {
    const expected = parseInt(reference.lastChapter, 10);
    if (!isNaN(expected) && expected > 0) {
      const ratio = Math.abs(result.chapterCount - expected) / expected;
      if (ratio <= 0.1) score += 30;
      else if (ratio <= 0.3) score += 20;
      else if (ratio <= 0.5) score += 10;
    }
  } else if (!result.chapterCount && score > 0) {
    // Provider doesn't report chapter count in search — benefit of the doubt
    score += 10;
  }

  if (reference.status && result.status) {
    if (reference.status.toLowerCase() === result.status.toLowerCase()) {
      score += 10;
    }
  }

  const qHasEdition = EDITION_KEYWORDS.some((kw) => qRaw.includes(kw));
  const rHasEdition = EDITION_KEYWORDS.some((kw) => rRaw.includes(kw));
  if (qHasEdition !== rHasEdition) {
    score -= 20;
  }

  return score;
}
