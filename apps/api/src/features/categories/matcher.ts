import { normalizeText } from '@bank/shared';

/** The part of a rule the matcher needs. Generic id so the matcher stays pure (ObjectId in the API, strings in tests). */
export interface MatchableRule<TId> {
  /** normalizeText(pattern). */
  patternKey: string;
  categoryId: TId;
  /** Lowest wins. */
  priority: number;
}

/** True when `candidate` beats `best`: lower priority first, then the longest (most specific) pattern, then alphabetical for determinism. */
function isBetter<TId>(candidate: MatchableRule<TId>, best: MatchableRule<TId>): boolean {
  if (candidate.priority !== best.priority) {
    return candidate.priority < best.priority;
  }
  if (candidate.patternKey.length !== best.patternKey.length) {
    return candidate.patternKey.length > best.patternKey.length;
  }
  return candidate.patternKey < best.patternKey;
}

/**
 * Category of the best rule whose pattern is contained in the normalized label, null when none matches.
 * Single linear pass (no sort) because the import calls it for every row.
 */
export function matchCategory<TId>(rules: readonly MatchableRule<TId>[], rawLabel: string): TId | null {
  const label: string = normalizeText(rawLabel);
  let best: MatchableRule<TId> | null = null;
  for (const rule of rules) {
    if (rule.patternKey === '' || !label.includes(rule.patternKey)) {
      continue;
    }
    if (best === null || isBetter(rule, best)) {
      best = rule;
    }
  }
  return best === null ? null : best.categoryId;
}
