import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CsvMapping } from '@bank/shared';
import { detectDelimiter, parseCsvRows, readCsvRows, type CsvDelimiter } from './csv';
import { guessDateFormat, parseDate } from './dates';
import { detectMapping } from './detect';
import { isOfx, parseOfx } from './ofx';
import { MAX_IMPORT_ROWS, type ParseResult } from './types';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

/** The full preview pipeline of a CSV without a saved profile: delimiter, rows, mapping, parse. */
function autoParse(text: string): { mapping: CsvMapping; result: ParseResult } {
  const delimiter: CsvDelimiter = detectDelimiter(text);
  const rows: string[][] = readCsvRows(text, delimiter);
  const mapping: CsvMapping | null = detectMapping(rows, delimiter);
  if (!mapping) {
    throw new Error('no mapping detected');
  }
  return { mapping, result: parseCsvRows(rows, mapping) };
}

describe('parseDate', () => {
  it.each([
    ['05/10/2026', 'DD/MM/YYYY', '2026-10-05'],
    ['5/1/2026', 'DD/MM/YYYY', '2026-01-05'],
    ['05/10/26', 'DD/MM/YYYY', '2026-10-05'],
    ['05-10-2026', 'DD-MM-YYYY', '2026-10-05'],
    ['05.10.2026', 'DD.MM.YYYY', '2026-10-05'],
    ['2026-10-05', 'YYYY-MM-DD', '2026-10-05'],
    ['2026-10-05 00:00:00', 'YYYY-MM-DD', '2026-10-05'],
    ['10/25/2026', 'MM/DD/YYYY', '2026-10-25'],
  ] as const)('parses %s as %s', (raw: string, format: Parameters<typeof parseDate>[1], expected: string) => {
    expect(parseDate(raw, format)).toBe(expected);
  });

  it('rejects impossible dates and wrong separators', () => {
    expect(parseDate('31/02/2026', 'DD/MM/YYYY')).toBeNull();
    expect(parseDate('05-10-2026', 'DD/MM/YYYY')).toBeNull();
    expect(parseDate('xx/09/2026', 'DD/MM/YYYY')).toBeNull();
    expect(parseDate('', 'YYYY-MM-DD')).toBeNull();
  });

  it('guesses day-first unless a value proves month-first', () => {
    expect(guessDateFormat(['05/10/2026', '04/10/2026'])?.format).toBe('DD/MM/YYYY');
    expect(guessDateFormat(['10/05/2026', '10/25/2026'])?.format).toBe('MM/DD/YYYY');
    expect(guessDateFormat(['2026-10-05'])?.format).toBe('YYYY-MM-DD');
    expect(guessDateFormat(['abc'])).toBeNull();
  });
});

describe('readCsvRows', () => {
  it('handles quotes, doubled quotes, embedded delimiters and line breaks, CRLF and BOM', () => {
    const text: string = '﻿a;"b;c";"say ""hi"""\r\n\r\n;;\r\n"multi\r\nline";2;3\r\n';
    expect(readCsvRows(text, ';')).toEqual([
      ['a', 'b;c', 'say "hi"'],
      ['multi\r\nline', '2', '3'],
    ]);
  });

  it('reads a last line without trailing newline', () => {
    expect(readCsvRows('a,b\n1,2', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('detectDelimiter', () => {
  it('finds ; despite decimal commas and metadata lines', () => {
    expect(detectDelimiter(fixture('credit-agricole.csv'))).toBe(';');
    expect(detectDelimiter(fixture('boursorama.csv'))).toBe(';');
    expect(detectDelimiter(fixture('lcl.csv'))).toBe(';');
  });

  it('finds , and tab', () => {
    expect(detectDelimiter(fixture('comma-dot.csv'))).toBe(',');
    expect(detectDelimiter('Date\tLibellé\tMontant\n05/10/2026\tCB CARREFOUR\t-45,20\n')).toBe('\t');
  });
});

describe('Crédit Agricole export (metadata lines, Débit / Crédit columns)', () => {
  const { mapping, result } = autoParse(fixture('credit-agricole.csv'));

  it('detects the header after the metadata and the split amounts', () => {
    expect(mapping).toEqual({
      delimiter: ';',
      skipRows: 6,
      hasHeader: true,
      dateColumn: 0,
      dateFormat: 'DD/MM/YYYY',
      labelColumns: [1],
      amount: { mode: 'split', debitColumn: 2, creditColumn: 3 },
      decimalSeparator: ',',
    });
  });

  it('stores debits negative whatever their sign, credits positive, and collapses multi-line labels', () => {
    expect(result.rows.slice(0, 3)).toEqual([
      { date: '2026-10-05', label: 'PAIEMENT PAR CARTE X1234 CARREFOUR MARKET 03/10', amountCents: -4520, dedupKey: expect.any(String) },
      { date: '2026-10-04', label: 'PRELEVEMENT EDF CLIENTS PARTICULIERS', amountCents: -8900, dedupKey: expect.any(String) },
      { date: '2026-10-02', label: 'VIREMENT EN VOTRE FAVEUR SALAIRE OCTOBRE MADBOX', amountCents: 285000, dedupKey: expect.any(String) },
    ]);
    const withdrawal: ParseResult['rows'][number] | undefined = result.rows.find((row) => row.label.startsWith('RETRAIT'));
    expect(withdrawal?.amountCents).toBe(-6000);
    expect(result.rows[result.rows.length - 1]?.amountCents).toBe(-100000);
  });

  it('skips the corrupted line and numbers identical triples', () => {
    expect(result.rows).toHaveLength(7);
    expect(result.skippedCount).toBe(1);
    const bakery: string[] = result.rows.filter((row) => row.label.includes('BOULANGERIE')).map((row) => row.dedupKey);
    expect(bakery).toEqual([
      '2026-10-01|-350|paiement par carte x1234 boulangerie paul 30/09|0',
      '2026-10-01|-350|paiement par carte x1234 boulangerie paul 30/09|1',
    ]);
  });

  it('gives the same keys when the same file is parsed again (idempotent import)', () => {
    const again: ParseResult = autoParse(fixture('credit-agricole.csv')).result;
    expect(again.rows.map((row) => row.dedupKey)).toEqual(result.rows.map((row) => row.dedupKey));
  });
});

describe('Boursorama export (signed amount, dateOp / dateVal)', () => {
  const { mapping, result } = autoParse(fixture('boursorama.csv'));

  it('uses the operation date, the label column and the amount column (not the balance)', () => {
    expect(mapping).toMatchObject({ skipRows: 0, hasHeader: true, dateColumn: 0, dateFormat: 'YYYY-MM-DD', labelColumns: [2], amount: { mode: 'single', column: 6 }, decimalSeparator: ',' });
  });

  it('parses signed amounts with thousand separators', () => {
    expect(result.skippedCount).toBe(0);
    expect(result.rows.map((row) => [row.date, row.amountCents])).toEqual([
      ['2026-10-05', -4520],
      ['2026-10-04', -1599],
      ['2026-10-02', 285000],
      ['2026-10-01', -11200],
    ]);
    expect(result.rows[0]?.label).toBe('CARTE 03/10/26 CARREFOUR CB*1234');
  });
});

describe('comma CSV with dot decimals', () => {
  const { mapping, result } = autoParse(fixture('comma-dot.csv'));

  it('detects , delimiter, ISO dates and . decimals', () => {
    expect(mapping).toMatchObject({ delimiter: ',', hasHeader: true, dateFormat: 'YYYY-MM-DD', labelColumns: [1], amount: { mode: 'single', column: 2 }, decimalSeparator: '.' });
  });

  it('keeps quoted commas and quotes in labels', () => {
    expect(result.rows.map((row) => [row.label, row.amountCents])).toEqual([
      ['CARD PAYMENT CARREFOUR, PARIS 15', -4520],
      ['Spotify AB', -1099],
      ['SALARY MADBOX', 285000],
      ['Amazon "Prime" EU', -699],
    ]);
  });
});

describe('LCL style export without header', () => {
  it('guesses columns from the content', () => {
    const { mapping, result } = autoParse(fixture('lcl.csv'));
    expect(mapping).toMatchObject({ skipRows: 0, hasHeader: false, dateColumn: 0, dateFormat: 'DD/MM/YYYY', labelColumns: [4], amount: { mode: 'single', column: 1 }, decimalSeparator: ',' });
    expect(result.rows[0]).toMatchObject({ date: '2026-10-05', label: 'CB CARREFOUR MARKET 04/10', amountCents: -4520 });
    expect(result.rows).toHaveLength(4);
  });
});

describe('parseCsvRows with an explicit mapping', () => {
  const rows: string[][] = [
    ['Date', 'Libellé', 'Détail', 'Débit', 'Crédit'],
    ['05/10/2026', 'CB', 'CARREFOUR', '-45,20', ''],
    ['06/10/2026', 'VIR', 'MAMIE', '', '+50,00'],
    ['07/10/2026', 'Solde', '', '', ''],
    ['08/10/2026', 'CB', 'FNAC', 'abc', ''],
  ];
  const mapping: CsvMapping = {
    delimiter: ';',
    skipRows: 0,
    hasHeader: true,
    dateColumn: 0,
    dateFormat: 'DD/MM/YYYY',
    labelColumns: [1, 2],
    amount: { mode: 'split', debitColumn: 3, creditColumn: 4 },
    decimalSeparator: ',',
  };

  it('joins label columns and skips rows without a readable amount', () => {
    const result: ParseResult = parseCsvRows(rows, mapping);
    expect(result.rows.map((row) => [row.label, row.amountCents])).toEqual([
      ['CB CARREFOUR', -4520],
      ['VIR MAMIE', 5000],
    ]);
    expect(result.skippedCount).toBe(2);
  });

  it('treats out of range columns as empty cells', () => {
    const result: ParseResult = parseCsvRows(rows, { ...mapping, dateColumn: 12 });
    expect(result.rows).toHaveLength(0);
    expect(result.skippedCount).toBe(4);
  });

  it('refuses files above the row limit', () => {
    const big: string[][] = new Array<string[]>(MAX_IMPORT_ROWS + 2).fill(['05/10/2026', 'CB', '', '-1,00', '']);
    expect(() => parseCsvRows(big, mapping)).toThrow(RangeError);
  });
});

describe('OFX', () => {
  it('detects OFX files only', () => {
    expect(isOfx(fixture('ofx-v1.ofx'))).toBe(true);
    expect(isOfx(fixture('ofx-v2.ofx'))).toBe(true);
    expect(isOfx(fixture('credit-agricole.csv'))).toBe(false);
  });

  it('parses v1 SGML with unclosed tags and decimal commas', () => {
    const result: ParseResult = parseOfx(fixture('ofx-v1.ofx'));
    expect(result.rows).toEqual([
      { date: '2026-10-05', label: 'CB CARREFOUR MARKET 03/10 X1234', amountCents: -4520, dedupKey: 'ofx:4A1B2C3D0001' },
      { date: '2026-10-04', label: 'PRLV EDF CLIENTS PARTICULIERS', amountCents: -8900, dedupKey: 'ofx:4A1B2C3D0002' },
      { date: '2026-10-02', label: 'VIR MADBOX SALAIRE', amountCents: 285000, dedupKey: 'ofx:4A1B2C3D0003' },
    ]);
    expect(result.skippedCount).toBe(1);
  });

  it('parses v2 XML, decodes entities and falls back to a content key without FITID', () => {
    const result: ParseResult = parseOfx(fixture('ofx-v2.ofx'));
    expect(result.rows).toEqual([
      { date: '2026-10-05', label: 'CARREFOUR MARKET CB 03/10 Paris', amountCents: -4520, dedupKey: 'ofx:202610050001' },
      { date: '2026-10-04', label: 'FREE MOBILE & BOX', amountCents: -1599, dedupKey: 'ofx:202610040001' },
      { date: '2026-10-02', label: 'VIR MADBOX SALAIRE', amountCents: 285000, dedupKey: '2026-10-02|285000|vir madbox salaire|0' },
    ]);
    expect(result.skippedCount).toBe(0);
  });

  it('parses single-line SGML', () => {
    const text: string = 'OFXHEADER:100\n<OFX><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-1.50<FITID>A1<NAME>CAFE</STMTTRN></OFX>';
    expect(parseOfx(text).rows).toEqual([{ date: '2026-10-05', label: 'CAFE', amountCents: -150, dedupKey: 'ofx:A1' }]);
  });
});
