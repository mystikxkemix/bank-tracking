import { normalizeText } from '@bank/shared';

/** Collapses whitespace (including line breaks inside quoted CSV cells) and trims. */
export function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Builds "<date>|<cents>|<normalized label>|<n>" keys where n counts identical triples inside the same file:
 * two real identical card payments on the same day stay distinct, re-importing the file yields the same keys.
 */
export class CsvDedupKeyBuilder {
  private readonly occurrences: Map<string, number> = new Map();

  next(date: string, amountCents: number, label: string): string {
    const triple: string = `${date}|${amountCents}|${normalizeText(label)}`;
    const index: number = this.occurrences.get(triple) ?? 0;
    this.occurrences.set(triple, index + 1);
    return `${triple}|${index}`;
  }
}
