import { describe, expect, it } from 'vitest';
import { normalizeText } from '@bank/shared';
import { matchCategory, type MatchableRule } from './matcher';

function rule(pattern: string, categoryId: string, priority: number = 100): MatchableRule<string> {
  return { patternKey: normalizeText(pattern), categoryId, priority };
}

describe('matchCategory', () => {
  const rules: MatchableRule<string>[] = [
    rule('CARREFOUR', 'courses'),
    rule('Carrefour Station', 'transports'),
    rule('NETFLIX', 'abonnements'),
    rule('SNCF', 'transports', 50),
    rule('PRLV SEPA', 'impots', 500),
    rule('Café', 'restaurants'),
  ];

  it('matches a substring case and accent insensitively', () => {
    expect(matchCategory(rules, 'PAIEMENT PAR CARTE X1234 CARREFOUR MARKET 03/10')).toBe('courses');
    expect(matchCategory(rules, 'CB CAFE DE FLORE 12/10')).toBe('restaurants');
    expect(matchCategory(rules, 'Prlv Sepa  EDF  CLIENTS')).toBe('impots');
  });

  it('prefers the longest pattern at equal priority', () => {
    expect(matchCategory(rules, 'CB CARREFOUR STATION 2 14/10')).toBe('transports');
  });

  it('prefers the lowest priority over a longer pattern', () => {
    const withPriority: MatchableRule<string>[] = [rule('PRLV SEPA SNCF CONNECT', 'impots', 200), rule('SNCF', 'transports', 10)];
    expect(matchCategory(withPriority, 'PRLV SEPA SNCF CONNECT')).toBe('transports');
  });

  it('collapses whitespace in the label before matching', () => {
    expect(matchCategory(rules, 'CB   CARREFOUR\n  STATION')).toBe('transports');
  });

  it('returns null without match or without rules', () => {
    expect(matchCategory(rules, 'VIR SEPA MME DUPONT')).toBeNull();
    expect(matchCategory([], 'CARREFOUR')).toBeNull();
  });

  it('is deterministic on full ties', () => {
    const tied: MatchableRule<string>[] = [rule('ABCD', 'b'), rule('ABC1', 'a')];
    expect(matchCategory(tied, 'ABCD ABC1')).toBe('a');
    expect(matchCategory([...tied].reverse(), 'ABCD ABC1')).toBe('a');
  });
});
