import { Card, Table, Text } from '@radix-ui/themes';
import type { ParsedTransaction } from '@bank/shared';
import { Money } from '../../components/Money';
import { formatDay } from '../../lib/format';

/** First parsed rows of a file, as they will be imported. */
export function SampleTable({ rows }: { rows: ParsedTransaction[] }) {
  if (rows.length === 0) {
    return (
      <Text as="p" size="2" color="gray">
        Aucune ligne lisible avec ces réglages.
      </Text>
    );
  }
  return (
    <Card size="1" style={{ padding: 0 }}>
      <Table.Root size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell width="110px">Date</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Libellé</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end" width="120px">
              Montant
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row: ParsedTransaction, index: number) => (
            <Table.Row key={index}>
              <Table.Cell>
                <Text size="2" color="gray" style={{ whiteSpace: 'nowrap' }}>
                  {formatDay(row.date)}
                </Text>
              </Table.Cell>
              <Table.Cell style={{ maxWidth: 360 }}>
                <Text size="2" truncate as="div">
                  {row.label}
                </Text>
              </Table.Cell>
              <Table.Cell justify="end">
                <Money cents={row.amountCents} colored size="2" />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Card>
  );
}
