import { describe, expect, it } from 'vitest';
import { parseAmountToCents } from './money';
import { addMonths } from './dates';

describe('parseAmountToCents', () => {
  it.each([
    ['1 234,56', ',', 123456],
    ['-12,5', ',', -1250],
    ['+3,00 €', ',', 300],
    ['1.234,56', ',', 123456],
    ['(12,50)', ',', -1250],
    ['-1,234.56', '.', -123456],
    ['12', '.', 1200],
    ['1 000,00', ',', 100000],
  ] as const)('parses %s', (raw: string, separator: ',' | '.', expected: number) => {
    expect(parseAmountToCents(raw, separator)).toBe(expected);
  });

  it('rejects garbage', () => {
    expect(parseAmountToCents('abc', ',')).toBeNull();
    expect(parseAmountToCents('', ',')).toBeNull();
  });
});

describe('addMonths', () => {
  it('crosses years', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-05', -17)).toBe('2024-12');
  });
});
