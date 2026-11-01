import type { CsvMapping, DateFormat } from '@bank/shared';

/** What a CSV column is used for, as picked in the column header selects. */
export type ColumnRole = 'ignore' | 'date' | 'label' | 'amount' | 'debit' | 'credit';

export const COLUMN_ROLE_LABELS: Record<ColumnRole, string> = {
  ignore: 'Ignorer',
  date: 'Date',
  label: 'Libellé',
  amount: 'Montant',
  debit: 'Débit',
  credit: 'Crédit',
};

export const COLUMN_ROLES: ColumnRole[] = ['ignore', 'date', 'label', 'amount', 'debit', 'credit'];

export type Delimiter = CsvMapping['delimiter'];

export const DELIMITER_LABELS: Record<Delimiter, string> = {
  ';': 'Point-virgule ( ; )',
  ',': 'Virgule ( , )',
  '\t': 'Tabulation',
  '|': 'Barre verticale ( | )',
};

/**
 * Editable, possibly incomplete version of a CsvMapping (the contract type requires every column).
 * Amount mode is implied: an amount column means "single", debit + credit columns mean "split".
 */
export interface MappingDraft {
  delimiter: Delimiter;
  skipRows: number;
  hasHeader: boolean;
  dateColumn: number | null;
  dateFormat: DateFormat;
  labelColumns: number[];
  amountColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  decimalSeparator: ',' | '.';
}

/** Draft from the server suggestion, or French bank defaults when nothing was detected. */
export function draftFromMapping(mapping: CsvMapping | null): MappingDraft {
  if (!mapping) {
    return {
      delimiter: ';',
      skipRows: 0,
      hasHeader: true,
      dateColumn: null,
      dateFormat: 'DD/MM/YYYY',
      labelColumns: [],
      amountColumn: null,
      debitColumn: null,
      creditColumn: null,
      decimalSeparator: ',',
    };
  }
  return {
    delimiter: mapping.delimiter,
    skipRows: mapping.skipRows,
    hasHeader: mapping.hasHeader,
    dateColumn: mapping.dateColumn,
    dateFormat: mapping.dateFormat,
    labelColumns: [...mapping.labelColumns],
    amountColumn: mapping.amount.mode === 'single' ? mapping.amount.column : null,
    debitColumn: mapping.amount.mode === 'split' ? mapping.amount.debitColumn : null,
    creditColumn: mapping.amount.mode === 'split' ? mapping.amount.creditColumn : null,
    decimalSeparator: mapping.decimalSeparator,
  };
}

/** Complete mapping, or null while a required column is missing. */
export function mappingFromDraft(draft: MappingDraft): CsvMapping | null {
  if (draft.dateColumn === null || draft.labelColumns.length === 0) {
    return null;
  }
  let amount: CsvMapping['amount'];
  if (draft.amountColumn !== null) {
    amount = { mode: 'single', column: draft.amountColumn };
  } else if (draft.debitColumn !== null && draft.creditColumn !== null) {
    amount = { mode: 'split', debitColumn: draft.debitColumn, creditColumn: draft.creditColumn };
  } else {
    return null;
  }
  return {
    delimiter: draft.delimiter,
    skipRows: draft.skipRows,
    hasHeader: draft.hasHeader,
    dateColumn: draft.dateColumn,
    dateFormat: draft.dateFormat,
    labelColumns: draft.labelColumns,
    amount,
    decimalSeparator: draft.decimalSeparator,
  };
}

/** French list of what is still missing, empty when the draft is complete. */
export function missingFields(draft: MappingDraft): string[] {
  const missing: string[] = [];
  if (draft.dateColumn === null) {
    missing.push('la colonne Date');
  }
  if (draft.labelColumns.length === 0) {
    missing.push('au moins une colonne Libellé');
  }
  if (draft.amountColumn === null && (draft.debitColumn === null || draft.creditColumn === null)) {
    missing.push(draft.debitColumn !== null || draft.creditColumn !== null ? 'les deux colonnes Débit et Crédit' : 'la colonne Montant (ou Débit et Crédit)');
  }
  return missing;
}

export function roleOf(draft: MappingDraft, column: number): ColumnRole {
  if (draft.dateColumn === column) {
    return 'date';
  }
  if (draft.amountColumn === column) {
    return 'amount';
  }
  if (draft.debitColumn === column) {
    return 'debit';
  }
  if (draft.creditColumn === column) {
    return 'credit';
  }
  return draft.labelColumns.includes(column) ? 'label' : 'ignore';
}

/**
 * Assigns a role to a column. Single-column roles move (the previous column becomes ignored),
 * "Montant" and "Débit / Crédit" exclude each other, several columns can form the label.
 */
export function setRole(draft: MappingDraft, column: number, role: ColumnRole): MappingDraft {
  const next: MappingDraft = { ...draft, labelColumns: draft.labelColumns.filter((item: number) => item !== column) };
  if (next.dateColumn === column) {
    next.dateColumn = null;
  }
  if (next.amountColumn === column) {
    next.amountColumn = null;
  }
  if (next.debitColumn === column) {
    next.debitColumn = null;
  }
  if (next.creditColumn === column) {
    next.creditColumn = null;
  }
  switch (role) {
    case 'date':
      next.dateColumn = column;
      break;
    case 'label':
      next.labelColumns = [...next.labelColumns, column].sort((a: number, b: number) => a - b);
      break;
    case 'amount':
      next.amountColumn = column;
      next.debitColumn = null;
      next.creditColumn = null;
      break;
    case 'debit':
      next.debitColumn = column;
      next.amountColumn = null;
      break;
    case 'credit':
      next.creditColumn = column;
      next.amountColumn = null;
      break;
    case 'ignore':
      break;
  }
  return next;
}
