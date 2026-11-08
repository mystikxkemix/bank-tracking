import { Badge, Box, Button, Card, Flex, Skeleton, Table, Text } from '@radix-ui/themes';
import type { SplitHistoryItem } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { formatMonth } from '../../lib/format';
import { useSplitHistory } from './api';

/** Saved months, newest first. Clicking a month opens it. */
export function SplitHistoryCard({ currentMonth, onSelect }: { currentMonth: string; onSelect: (month: string) => void }) {
  const history = useSplitHistory();

  // Nothing saved yet: the onboarding or the draft says it already, an empty history card would only add noise.
  if (history.data?.length === 0) {
    return null;
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="1" mb="3">
        <Text weight="bold">Historique</Text>
        <Text size="1" color="gray">
          Les mois enregistrés. En rouge, une personne a dû compléter le compte commun.
        </Text>
      </Flex>
      <ErrorCallout error={history.error} />
      {history.isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="32px" />
          <Skeleton height="32px" />
        </Flex>
      ) : (
        <Table.Root size="1">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Mois</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">À garder</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Virements perso</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {history.data?.map((item: SplitHistoryItem) => (
              <Table.Row key={item.month} align="center">
                <Table.RowHeaderCell>
                  <Flex align="center" gap="2" wrap="wrap">
                    <Button variant="ghost" size="1" onClick={() => onSelect(item.month)} style={{ textTransform: 'capitalize' }}>
                      {formatMonth(item.month)}
                    </Button>
                    {item.month === currentMonth && (
                      <Badge size="1" color="gray">
                        affiché
                      </Badge>
                    )}
                  </Flex>
                </Table.RowHeaderCell>
                <Table.Cell justify="end">
                  <Money cents={item.keepOnJointCents} />
                </Table.Cell>
                <Table.Cell>
                  <Flex direction={{ initial: 'column', sm: 'row' }} gap={{ initial: '1', sm: '3' }} wrap="wrap">
                    {item.persons.map((person) => (
                      <Box key={person.personId}>
                        <Text size="1" color={person.returnCents < 0 ? 'red' : 'gray'}>
                          {person.name}{' '}
                        </Text>
                        <Text size="2" color={person.returnCents < 0 ? 'red' : undefined} weight={person.returnCents < 0 ? 'bold' : undefined}>
                          <Money cents={person.returnCents} />
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Card>
  );
}
