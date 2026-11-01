import { parseAmountToCents } from '@bank/shared';
import { CsvDedupKeyBuilder, cleanLabel } from './dedup';
import { MAX_IMPORT_ROWS, type ImportedRow, type ParseResult } from './types';

/** OFX v1 starts with an "OFXHEADER:100" block, v2 with an XML prolog then <OFX>. */
export function isOfx(text: string): boolean {
  const head: string = text.slice(0, 2000);
  return /OFXHEADER/i.test(head) || /<OFX>/i.test(text);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole: string, entity: string): string => {
    const lower: string = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      return String.fromCodePoint(parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith('#')) {
      return String.fromCodePoint(Number(lower.slice(1)));
    }
    return ENTITIES[lower] ?? whole;
  });
}

/**
 * Value of a leaf tag. Works for SGML (v1: "<NAME>CARREFOUR" closed by the next tag or line end)
 * and XML (v2: "<NAME>CARREFOUR</NAME>") because the value stops at the first "<" or line break.
 */
function tagValue(block: string, tag: string): string {
  const match: RegExpExecArray | null = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(block);
  return match ? decodeEntities(match[1] ?? '').trim() : '';
}

/** "20261005", "20261005120000[+1:CET]" -> "2026-10-05". */
function parseOfxDate(raw: string): string | null {
  const match: RegExpExecArray | null = /^(\d{4})(\d{2})(\d{2})/.exec(raw);
  if (!match) {
    return null;
  }
  const year: number = Number(match[1]);
  const month: number = Number(match[2]);
  const day: number = Number(match[3]);
  const date: Date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/** The spec says ".", but several French banks write "-45,20" in TRNAMT. */
function parseOfxAmount(raw: string): number | null {
  const separator: ',' | '.' = raw.includes(',') && !raw.includes('.') ? ',' : '.';
  return parseAmountToCents(raw, separator);
}

/** Splits the statement into STMTTRN blocks. v1 may omit </STMTTRN>, so a block also ends at the next one. */
function transactionBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex: RegExp = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|<\/STMTRS>|$)/gi;
  let match: RegExpExecArray | null = regex.exec(text);
  while (match !== null) {
    blocks.push(match[1] ?? '');
    match = regex.exec(text);
  }
  return blocks;
}

/** Parses bank and credit card statement transactions. dedupKey "ofx:<FITID>", CSV-style key when FITID is missing. */
export function parseOfx(text: string): ParseResult {
  const blocks: string[] = transactionBlocks(text);
  if (blocks.length > MAX_IMPORT_ROWS) {
    throw new RangeError('too_many_rows');
  }
  const fallbackKeys: CsvDedupKeyBuilder = new CsvDedupKeyBuilder();
  const rows: ImportedRow[] = [];
  let skippedCount: number = 0;
  for (const block of blocks) {
    const date: string | null = parseOfxDate(tagValue(block, 'DTPOSTED'));
    const amountCents: number | null = parseOfxAmount(tagValue(block, 'TRNAMT'));
    if (date === null || amountCents === null) {
      skippedCount++;
      continue;
    }
    const name: string = tagValue(block, 'NAME');
    const memo: string = tagValue(block, 'MEMO');
    // Some banks repeat the name in MEMO: do not double it.
    const label: string = cleanLabel(memo === '' || memo === name ? name : `${name} ${memo}`) || 'Sans libellé';
    const fitId: string = tagValue(block, 'FITID');
    const dedupKey: string = fitId !== '' ? `ofx:${fitId}` : fallbackKeys.next(date, amountCents, label);
    rows.push({ date, label, amountCents, dedupKey });
  }
  return { rows, skippedCount };
}
