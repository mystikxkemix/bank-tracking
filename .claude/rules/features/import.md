---
paths:
  - "apps/api/src/features/imports/**"
  - "apps/web/src/features/import/**"
  - "packages/shared/src/schemas/imports.ts"
---
# Feature: import (CSV / OFX)

## Goal
The only way data enters: the user exports a statement from their bank and imports it. Must be forgiving with French bank exports, idempotent and undoable.

## Flow
1. Pick the account, drop a file. Client decodes it: `TextDecoder('utf-8', { fatal: true })`, fallback `windows-1252` (most French banks). Sends text.
2. `POST /imports/preview` -> `ImportPreview`:
   - OFX (detected by `OFXHEADER` or `<OFX>`): parsed directly, `sample` + `totalCount`.
   - CSV: delimiter auto-detected (`;` `,` tab `|`, the most consistent count over the first lines), `rawRows` (first 20), `suggestedMapping` = account `importProfile` if it parses, else auto-detection (header names: date/libellé/montant/débit/crédit..., date format guessed from values), and `sample` parsed with it.
3. CSV only: mapping UI (column pickers on the raw table, date format, decimal separator, skip rows, single vs debit/credit). Every change calls `/imports/preview` again WITH `mapping` (debounced): one parser only, server-side. `validCount` / `skippedCount` cover the whole file.
4. `POST /imports` (`CommitImportBody`) -> `ImportRecord`. Saves the mapping as the account `importProfile`.
5. History list with "Annuler l'import" (DELETE).

## API (/api/spaces/:spaceId/imports)
POST `/preview`, POST `/`, GET `/` (`ImportRecord[]` newest first, with account), DELETE `/:id` (deletes its transactions then the record).

## Parsing rules (pure functions in `imports/parsers/`, fully unit tested with real-looking fixtures)
- CSV: RFC 4180 quotes, skip empty lines, `skipRows` then optional header.
- Dates per `DateFormat`; invalid -> row skipped (`skippedCount`).
- Amounts with `parseAmountToCents(raw, decimalSeparator)`; split mode: debit stored negative whatever its sign in the file, credit positive, empty cell = 0.
- Label: `labelColumns` joined with " ", whitespace collapsed. `rawLabel` = that string, `label` = same initially.
- OFX: SGML (v1, unclosed tags) and XML (v2). `STMTTRN`: `DTPOSTED` (YYYYMMDD...), `TRNAMT`, `NAME` + `MEMO`, `FITID`.
- dedupKey: OFX `ofx:<FITID>`; CSV `<date>|<cents>|<normalizeText(rawLabel)>|<n>` (n = occurrence of that triple in the file).
- Insert with `insertMany(ordered: false)`, count 11000 errors as duplicates. Apply `matchCategory` before insert.
- Limits: 10 MB text, 50 000 rows.

## Fixtures to cover
Crédit Agricole style (`;`, `dd/mm/yyyy`, Débit/Crédit columns, metadata lines on top), Boursorama style (`;`, signed amount, `dateOp;dateVal;label;category;...`), LCL/BNP style, comma CSV with `.` decimals, OFX v1 and v2.

## UI
Stepper: 1 Fichier (account select + dropzone), 2 Correspondance (CSV only, raw table with column headers as selects, live preview of parsed rows, errors highlighted), 3 Aperçu (count, first rows, duplicates info), result screen with "Voir les transactions" and "Catégoriser les X non catégorisées". Import history below. Viewers: page hidden.

## Status
Contract + model done. Parsers and API done and smoke-tested (2026-11-01).
- `parsers/` (pure, vitest + fixtures in `parsers/fixtures/`): `csv.ts` (delimiter detection, RFC 4180 reader, mapping parse), `detect.ts` (header detection of French columns after metadata lines, content-based guess for headerless exports), `dates.ts`, `ofx.ts` (v1 SGML / v2 XML, TRNAMT with decimal comma accepted), `dedup.ts`.
- Row indexes (`skipRows`, `rawRows`) are counted AFTER dropping blank lines and lines made only of delimiters (";;;"): the Crédit Agricole fixture has 6 metadata rows, not 9 text lines.
- Split mode: a line with both debit and credit empty (balance line) is skipped, not imported at 0.
- A saved profile is reused when it yields at least one row and no more skipped than valid rows; otherwise auto-detection.
- Commit: 400 `mapping_required` (CSV without mapping), 400 `empty_import` (no readable row), 400 `too_many_rows` (> 50 000). A re-import with 0 new rows still creates an `ImportRecord` (history shows "0 nouvelles, N doublons").
UI done (2026-11-01): `ImportPage.tsx` (viewer message, no-account empty state, wizard: account select + dropzone/file picker, 10 MB check, jumps straight to Aperçu when the suggested mapping already reads rows, Correspondance for CSV via `CsvMappingStep.tsx` + `mappingDraft.ts` (column role selects on the raw table, delimiter, date format, decimal separator, skip rows, header; re-preview debounced 400 ms with out-of-order answers dropped), Aperçu with counts, skipped warning and sample, commit -> `/review?importId=`), import history with "Revoir" and undo. Verified with the Crédit Agricole, Boursorama and OFX v1 fixtures.
