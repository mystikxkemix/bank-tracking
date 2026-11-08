import { MongoBulkWriteError, ObjectId, type InsertManyResult, type WithId, type WriteError } from 'mongodb';
import {
  isoDateToUtc,
  type CommitImportBody,
  type CsvMapping,
  type ImportFormat,
  type ImportPreview,
  type ImportPreviewBody,
  type ImportRecord,
  type ParsedTransaction,
} from '@bank/shared';
import { badRequest, notFound } from '../../lib/errors';
import { getAccountDoc, saveImportProfile } from '../accounts/service';
import type { AccountDoc } from '../accounts/model';
import { listRuleDocs } from '../categories/service';
import { matchCategory } from '../categories/matcher';
import type { RuleDoc } from '../categories/model';
import { transactionsCollection, type TransactionDoc } from '../transactions/model';
import { detectDelimiter, parseCsvRows, readCsvRows, type CsvDelimiter } from './parsers/csv';
import { detectMapping } from './parsers/detect';
import { isOfx, parseOfx } from './parsers/ofx';
import { MAX_IMPORT_ROWS, type ImportedRow, type ParseResult } from './parsers/types';
import { importsCollection, type ImportDoc } from './model';

/** Rows shown in the mapping UI and parsed transactions shown in the preview. */
const PREVIEW_ROWS: number = 20;
const DUPLICATE_KEY_CODE: number = 11000;

function toDto(doc: WithId<ImportDoc>): ImportRecord {
  return {
    id: doc._id.toHexString(),
    accountId: doc.accountId.toHexString(),
    fileName: doc.fileName,
    format: doc.format,
    insertedCount: doc.insertedCount,
    duplicateCount: doc.duplicateCount,
    skippedCount: doc.skippedCount,
    categorizedCount: doc.categorizedCount,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toParsedTransaction(row: ImportedRow): ParsedTransaction {
  return { date: row.date, label: row.label, amountCents: row.amountCents };
}

/** Parsers throw a RangeError above MAX_IMPORT_ROWS: turned into a French 400. */
function guardRowLimit<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      throw badRequest('too_many_rows', `Fichier trop volumineux : ${MAX_IMPORT_ROWS.toLocaleString('fr-FR')} lignes maximum`);
    }
    throw error;
  }
}

interface CsvAttempt {
  rows: string[][];
  mapping: CsvMapping | null;
  result: ParseResult | null;
}

function attemptCsv(content: string, delimiter: CsvDelimiter, mapping: CsvMapping | null): CsvAttempt {
  const rows: string[][] = readCsvRows(content, delimiter);
  const resolved: CsvMapping | null = mapping ?? detectMapping(rows, delimiter);
  return { rows, mapping: resolved, result: resolved ? guardRowLimit((): ParseResult => parseCsvRows(rows, resolved)) : null };
}

/** A saved profile is reused only when it still reads the file (banks change their export format). */
function profileFits(attempt: CsvAttempt): boolean {
  return attempt.result !== null && attempt.result.rows.length > 0 && attempt.result.rows.length >= attempt.result.skippedCount;
}

/** Mapping from the body, else the account profile if it parses, else auto-detection. */
function resolveCsv(content: string, bodyMapping: CsvMapping | undefined, profile: CsvMapping | null): CsvAttempt {
  if (bodyMapping) {
    return attemptCsv(content, bodyMapping.delimiter, bodyMapping);
  }
  if (profile) {
    const fromProfile: CsvAttempt = attemptCsv(content, profile.delimiter, profile);
    if (profileFits(fromProfile)) {
      return fromProfile;
    }
  }
  return attemptCsv(content, detectDelimiter(content), null);
}

export async function previewImport(spaceId: ObjectId, body: ImportPreviewBody): Promise<ImportPreview> {
  const account: WithId<AccountDoc> = await getAccountDoc(spaceId, new ObjectId(body.accountId));
  if (isOfx(body.content)) {
    const result: ParseResult = guardRowLimit((): ParseResult => parseOfx(body.content));
    return { format: 'ofx', sample: result.rows.slice(0, PREVIEW_ROWS).map(toParsedTransaction), totalCount: result.rows.length };
  }
  const attempt: CsvAttempt = resolveCsv(body.content, body.mapping, account.importProfile);
  return {
    format: 'csv',
    rawRows: attempt.rows.slice(0, PREVIEW_ROWS),
    suggestedMapping: attempt.mapping,
    sample: attempt.result ? attempt.result.rows.slice(0, PREVIEW_ROWS).map(toParsedTransaction) : [],
    validCount: attempt.result ? attempt.result.rows.length : 0,
    skippedCount: attempt.result ? attempt.result.skippedCount : 0,
  };
}

/** The driver types writeErrors as one error or a list (WriteError is a type-only export at runtime). */
function isWriteErrorList(errors: WriteError | readonly WriteError[]): errors is readonly WriteError[] {
  return Array.isArray(errors);
}

function asArray(errors: WriteError | readonly WriteError[]): readonly WriteError[] {
  return isWriteErrorList(errors) ? errors : [errors];
}

interface InsertOutcome {
  insertedCount: number;
  duplicateCount: number;
  /** Indexes (in the docs array) that were not inserted. */
  failedIndexes: Set<number>;
}

/**
 * Unordered insert: rows already present (unique { accountId, dedupKey }) fail with 11000 and are counted
 * as duplicates while the others are inserted. Any other write error is rethrown.
 */
async function insertTransactions(docs: TransactionDoc[]): Promise<InsertOutcome> {
  if (docs.length === 0) {
    return { insertedCount: 0, duplicateCount: 0, failedIndexes: new Set<number>() };
  }
  try {
    const result: InsertManyResult<TransactionDoc> = await transactionsCollection().insertMany(docs, { ordered: false });
    return { insertedCount: result.insertedCount, duplicateCount: 0, failedIndexes: new Set<number>() };
  } catch (error: unknown) {
    if (!(error instanceof MongoBulkWriteError)) {
      throw error;
    }
    const failedIndexes: Set<number> = new Set();
    let duplicateCount: number = 0;
    for (const writeError of asArray(error.writeErrors)) {
      if (writeError.code !== DUPLICATE_KEY_CODE) {
        throw error;
      }
      failedIndexes.add(writeError.index);
      duplicateCount++;
    }
    return { insertedCount: error.insertedCount, duplicateCount, failedIndexes };
  }
}

/**
 * Parses the whole file, categorizes with the space rules, inserts (duplicates skipped by dedupKey)
 * and records the import. CSV: the mapping is required and saved as the account import profile.
 */
export async function commitImport(spaceId: ObjectId, body: CommitImportBody): Promise<ImportRecord> {
  const accountId: ObjectId = new ObjectId(body.accountId);
  await getAccountDoc(spaceId, accountId);
  const format: ImportFormat = isOfx(body.content) ? 'ofx' : 'csv';
  let parsed: ParseResult;
  if (format === 'ofx') {
    parsed = guardRowLimit((): ParseResult => parseOfx(body.content));
  } else {
    const mapping: CsvMapping | undefined = body.mapping;
    if (!mapping) {
      throw badRequest('mapping_required', 'Indique la correspondance des colonnes pour importer un fichier CSV');
    }
    parsed = guardRowLimit((): ParseResult => parseCsvRows(readCsvRows(body.content, mapping.delimiter), mapping));
  }
  if (parsed.rows.length === 0) {
    throw badRequest('empty_import', 'Aucune transaction lisible dans ce fichier : vérifie la correspondance des colonnes');
  }

  const importId: ObjectId = new ObjectId();
  const rules: WithId<RuleDoc>[] = await listRuleDocs(spaceId);
  const now: Date = new Date();
  const docs: TransactionDoc[] = [];
  for (const row of parsed.rows) {
    docs.push({
      spaceId,
      accountId,
      date: isoDateToUtc(row.date),
      label: row.label,
      rawLabel: row.label,
      amountCents: row.amountCents,
      categoryId: matchCategory(rules, row.label),
      note: null,
      importId,
      dedupKey: row.dedupKey,
      createdAt: now,
      updatedAt: now,
    });
  }
  const outcome: InsertOutcome = await insertTransactions(docs);
  let categorizedCount: number = 0;
  for (let index: number = 0; index < docs.length; index++) {
    if (docs[index]?.categoryId && !outcome.failedIndexes.has(index)) {
      categorizedCount++;
    }
  }

  const record: ImportDoc = {
    spaceId,
    accountId,
    fileName: body.fileName,
    format,
    insertedCount: outcome.insertedCount,
    duplicateCount: outcome.duplicateCount,
    skippedCount: parsed.skippedCount,
    categorizedCount,
    createdAt: now,
  };
  await importsCollection().insertOne({ ...record, _id: importId });
  if (format === 'csv' && body.mapping) {
    await saveImportProfile(spaceId, accountId, body.mapping);
  }
  return toDto({ ...record, _id: importId });
}

/** Newest first. The UI resolves account names from its accounts query. */
export async function listImports(spaceId: ObjectId): Promise<ImportRecord[]> {
  const docs: WithId<ImportDoc>[] = await importsCollection().find({ spaceId }).sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(toDto);
}

/** Undo: deletes the transactions created by this import (edits included), then the record. */
export async function deleteImport(spaceId: ObjectId, id: ObjectId): Promise<void> {
  const doc: WithId<ImportDoc> | null = await importsCollection().findOne({ _id: id, spaceId });
  if (!doc) {
    throw notFound('Import');
  }
  await transactionsCollection().deleteMany({ spaceId, importId: id });
  await importsCollection().deleteOne({ _id: id, spaceId });
}
