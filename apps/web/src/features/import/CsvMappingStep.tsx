import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Box, Callout, Card, Checkbox, Flex, Grid, SegmentedControl, Select, Spinner, Table, Text, TextField } from '@radix-ui/themes';
import { DATE_FORMATS, type DateFormat, type ImportPreview } from '@bank/shared';
import { COLUMN_ROLE_LABELS, COLUMN_ROLES, DELIMITER_LABELS, missingFields, roleOf, setRole, type ColumnRole, type Delimiter, type MappingDraft } from './mappingDraft';
import { SampleTable } from './SampleTable';

type CsvPreview = Extract<ImportPreview, { format: 'csv' }>;

const DELIMITERS: Delimiter[] = [';', ',', '\t', '|'];

interface CsvMappingStepProps {
  preview: CsvPreview;
  draft: MappingDraft;
  onChange: (draft: MappingDraft) => void;
  /** A new preview is on its way (debounced call in flight). */
  refreshing: boolean;
}

/** Step 2 for CSV: what each column means, plus file-level options. Every change re-parses the file server-side. */
export function CsvMappingStep({ preview, draft, onChange, refreshing }: CsvMappingStepProps) {
  const columnCount: number = maxColumns(preview.rawRows);
  const columns: number[] = Array.from({ length: columnCount }, (_value: unknown, index: number) => index);
  const missing: string[] = missingFields(draft);
  const headerIndex: number = draft.hasHeader ? draft.skipRows : -1;

  return (
    <Flex direction="column" gap="4">
      <Text size="2" color="gray">
        Indique ce que contient chaque colonne. Le libellé peut combiner plusieurs colonnes. Pour les montants, choisis une colonne Montant, ou deux colonnes Débit et
        Crédit.
      </Text>

      <Card size="1" style={{ padding: 0 }}>
        <Table.Root size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="64px">
                <Text size="1" color="gray">
                  Ligne
                </Text>
              </Table.ColumnHeaderCell>
              {columns.map((column: number) => (
                <Table.ColumnHeaderCell key={column} style={{ minWidth: 130 }}>
                  <Select.Root size="1" value={roleOf(draft, column)} onValueChange={(value: string) => onChange(setRole(draft, column, value as ColumnRole))}>
                    <Select.Trigger aria-label={`Rôle de la colonne ${column + 1}`} variant={roleOf(draft, column) === 'ignore' ? 'surface' : 'soft'} style={{ width: '100%' }} />
                    <Select.Content>
                      {COLUMN_ROLES.map((role: ColumnRole) => (
                        <Select.Item key={role} value={role}>
                          {COLUMN_ROLE_LABELS[role]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {preview.rawRows.map((row: string[], rowIndex: number) => {
              const skipped: boolean = rowIndex < draft.skipRows;
              const isHeader: boolean = rowIndex === headerIndex;
              return (
                <Table.Row key={rowIndex} style={{ opacity: skipped ? 0.45 : 1, background: isHeader ? 'var(--gray-a3)' : undefined }}>
                  <Table.Cell>
                    <Text size="1" color="gray" title={skipped ? 'Ligne ignorée' : isHeader ? 'En-têtes' : undefined} style={{ whiteSpace: 'nowrap' }}>
                      {skipped ? '–' : isHeader ? 'En-tête' : rowIndex + 1}
                    </Text>
                  </Table.Cell>
                  {columns.map((column: number) => (
                    <Table.Cell key={column} style={{ maxWidth: 240 }}>
                      <Text size="1" weight={isHeader ? 'bold' : 'regular'} truncate as="div">
                        {row[column] ?? ''}
                      </Text>
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card>

      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" id="mapping-delimiter">
            Séparateur de colonnes
          </Text>
          <Select.Root value={draft.delimiter} onValueChange={(value: string) => onChange({ ...draft, delimiter: value as Delimiter })}>
            <Select.Trigger aria-labelledby="mapping-delimiter" />
            <Select.Content>
              {DELIMITERS.map((delimiter: Delimiter) => (
                <Select.Item key={delimiter} value={delimiter}>
                  {DELIMITER_LABELS[delimiter]}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" id="mapping-date-format">
            Format des dates
          </Text>
          <Select.Root value={draft.dateFormat} onValueChange={(value: string) => onChange({ ...draft, dateFormat: value as DateFormat })}>
            <Select.Trigger aria-labelledby="mapping-date-format" />
            <Select.Content>
              {DATE_FORMATS.map((format: DateFormat) => (
                <Select.Item key={format} value={format}>
                  {format.replace('DD', 'JJ').replace('YYYY', 'AAAA')}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium" id="mapping-decimal">
            Séparateur décimal
          </Text>
          <SegmentedControl.Root value={draft.decimalSeparator} onValueChange={(value: string) => onChange({ ...draft, decimalSeparator: value as ',' | '.' })} aria-labelledby="mapping-decimal">
            <SegmentedControl.Item value=",">Virgule (12,50)</SegmentedControl.Item>
            <SegmentedControl.Item value=".">Point (12.50)</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        <Text as="label" size="2" weight="medium">
          Lignes à ignorer au début
          <TextField.Root
            mt="1"
            type="number"
            min={0}
            max={50}
            value={String(draft.skipRows)}
            onChange={(event) => {
              const value: number = Number.parseInt(event.target.value, 10);
              onChange({ ...draft, skipRows: Number.isFinite(value) ? Math.min(50, Math.max(0, value)) : 0 });
            }}
          />
          <Text as="div" size="1" color="gray" weight="regular" mt="1">
            Les banques ajoutent souvent le nom du compte ou le solde avant le tableau.
          </Text>
        </Text>
        <Text as="label" size="2" weight="medium">
          <Flex gap="2" align="center" mt={{ initial: '0', sm: '5' }}>
            <Checkbox checked={draft.hasHeader} onCheckedChange={(checked) => onChange({ ...draft, hasHeader: checked === true })} />
            La première ligne lue contient les titres
          </Flex>
        </Text>
      </Grid>

      {missing.length > 0 ? (
        <Callout.Root color="amber">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Il manque {joinFrench(missing)}.</Callout.Text>
        </Callout.Root>
      ) : (
        <Box>
          <Flex align="center" gap="2" mb="2">
            <Text size="2" weight="bold">
              Résultat de la lecture
            </Text>
            {refreshing ? (
              <Spinner size="1" />
            ) : (
              <Text size="2" color={preview.skippedCount > 0 ? 'orange' : 'gray'}>
                {preview.validCount} ligne{preview.validCount > 1 ? 's' : ''} lue{preview.validCount > 1 ? 's' : ''}
                {preview.skippedCount > 0 ? `, ${preview.skippedCount} illisible${preview.skippedCount > 1 ? 's' : ''} (date ou montant)` : ''}
              </Text>
            )}
          </Flex>
          <Box style={{ opacity: refreshing ? 0.6 : 1 }}>
            <SampleTable rows={preview.sample.slice(0, 8)} />
          </Box>
        </Box>
      )}
    </Flex>
  );
}

function maxColumns(rows: string[][]): number {
  let max: number = 0;
  for (const row of rows) {
    max = Math.max(max, row.length);
  }
  return max;
}

/** ["a", "b", "c"] -> "a, b et c" */
function joinFrench(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}
