import { normalizeText } from '@bank/shared';

/**
 * Bank noise that never identifies a merchant: payment method prefixes and filler words.
 * Lower case without accents: tokens are compared after normalizeText.
 */
const NOISE_WORDS: Set<string> = new Set([
  'cb', 'carte', 'paiement', 'votre', 'notre', 'faveur', 'vers', 'ordre', 'sur', 'emission', 'reception', 'prlv', 'prelevement', 'sepa', 'vir', 'virement', 'inst', 'instantane', 'recu', 'emis', 'de', 'du', 'des', 'la',
  'le', 'les', 'a', 'au', 'aux', 'et', 'en', 'par', 'pour', 'fact', 'facture', 'retrait', 'dab', 'achat', 'web', 'www',
]);

/** Words that end the merchant name ("PHARMACIE DU MARCHE" -> "PHARMACIE"). */
const STOP_WORDS: Set<string> = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'a', 'au', 'aux', 'et', 'en', 'par', 'pour']);

/**
 * Suggests a rule pattern from a raw bank label: drops payment prefixes, dates, card numbers and amounts,
 * keeps at most the first two meaningful words. "CB CARREFOUR CITY 23/10 PARIS 11" -> "CARREFOUR CITY".
 * Returns '' when nothing usable remains (the user then types the pattern).
 */
export function suggestRulePattern(rawLabel: string): string {
  const tokens: string[] = rawLabel.split(/[\s*/]+/);
  const kept: string[] = [];
  let started: boolean = false;
  for (const token of tokens) {
    const cleaned: string = token.replace(/[^\p{L}\p{N}'&.-]/gu, '');
    const key: string = normalizeText(cleaned);
    if (!key) {
      continue;
    }
    const hasDigit: boolean = /\d/.test(key);
    if (!started) {
      // Skip the prefix until the first real word.
      if (hasDigit || NOISE_WORDS.has(key) || key.length < 2) {
        continue;
      }
      started = true;
      kept.push(cleaned);
      continue;
    }
    if (hasDigit || STOP_WORDS.has(key) || kept.length >= 2) {
      break;
    }
    kept.push(cleaned);
  }
  return kept.join(' ').toUpperCase();
}

/** Same matching as the API (normalized "contains"), used to preview how many rows a rule would catch. */
export function labelMatchesPattern(rawLabel: string, pattern: string): boolean {
  const key: string = normalizeText(pattern);
  return key.length >= 2 && normalizeText(rawLabel).includes(key);
}
