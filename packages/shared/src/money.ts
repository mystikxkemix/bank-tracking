/**
 * Money helpers. Amounts are ALWAYS integer cents in the whole codebase:
 * negative = money going out (expense), positive = money coming in (income).
 */

const formatters: Map<string, Intl.NumberFormat> = new Map();

/** Formats integer cents as a localized currency string, e.g. -1234 -> "-12,34 €". */
export function formatCents(cents: number, currency: string = 'EUR', locale: string = 'fr-FR'): string {
  const key: string = `${locale}|${currency}`;
  let formatter: Intl.NumberFormat | undefined = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}

/**
 * Parses a human or bank-export amount ("1 234,56", "-12.50", "+3,00 €") into integer cents.
 * Returns null when the input does not contain a valid number.
 */
export function parseAmountToCents(raw: string, decimalSeparator: ',' | '.' = ','): number | null {
  // Drop currency symbols, regular / non-breaking / narrow spaces and apostrophes used as thousand separators.
  let cleaned: string = raw.trim().replace(/[\s  '€$£]/g, '');
  if (cleaned === '') {
    return null;
  }
  // Accounting style "(12,50)" means negative.
  let negative: boolean = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (decimalSeparator === ',') {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const value: number = Math.round(Number(cleaned) * 100);
  return negative ? -value : value;
}
