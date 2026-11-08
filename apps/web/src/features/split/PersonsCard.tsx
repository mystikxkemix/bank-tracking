import { CheckIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Card, Flex, IconButton, Link, Text, TextField } from '@radix-ui/themes';
import { equalShares, formatShare, newLineId, parseShare, proratedShares, shareTotal, type DraftPerson, type SplitDraft } from './splitDraft';
import { PersonAvatar } from './SplitResultCards';

/** One color per person in the shares bar (order of the plan). */
const PERSON_COLORS: string[] = ['indigo', 'pink', 'teal', 'amber', 'cyan', 'grass', 'orange', 'violet', 'brown', 'sky'];

interface PersonsCardProps {
  draft: SplitDraft;
  readOnly: boolean;
  showErrors: boolean;
  onChange: (draft: SplitDraft) => void;
}

/** "Parts du foyer": names and free share percentages, with a live check of the 100 % total. */
export function PersonsCard({ draft, readOnly, showErrors, onChange }: PersonsCardProps) {
  const total: number = shareTotal(draft);
  const totalOk: boolean = Math.abs(total - 100) <= 0.001;
  const prorata: number[] | null = readOnly ? null : proratedShares(draft);
  const prorataDiffers: boolean = prorata !== null && prorata.some((share: number, index: number) => share !== parseShare(draft.persons[index]?.shareText ?? ''));

  const updatePerson = (id: string, patch: Partial<DraftPerson>): void => {
    onChange({ ...draft, persons: draft.persons.map((person: DraftPerson) => (person.id === id ? { ...person, ...patch } : person)) });
  };

  const removePerson = (id: string): void => {
    // Their incomes cannot exist without them (the API rejects unknown personId).
    onChange({ ...draft, persons: draft.persons.filter((person: DraftPerson) => person.id !== id), incomes: draft.incomes.filter((income) => income.personId !== id) });
  };

  const addPerson = (): void => {
    onChange({ ...draft, persons: [...draft.persons, { id: newLineId(), name: '', shareText: '0' }] });
  };

  const applyShares = (shares: number[]): void => {
    onChange({ ...draft, persons: draft.persons.map((person: DraftPerson, index: number) => ({ ...person, shareText: formatShare(shares[index] ?? 0) })) });
  };

  return (
    <Card size="2">
      <Flex justify="between" align="center" gap="3" mb="3" wrap="wrap">
        <Box>
          <Text as="div" weight="bold">
            Parts du foyer
          </Text>
          <Text as="div" size="1" color="gray">
            Chacun paie sa part des charges et de l'épargne communes.
          </Text>
        </Box>
        <Badge color={totalOk ? 'green' : 'red'} size="2">
          {totalOk ? <CheckIcon /> : <ExclamationTriangleIcon />}
          {totalOk ? 'Total 100 %' : `Total ${formatShare(total)} %, ${total < 100 ? 'il manque' : 'en trop :'} ${formatShare(Math.abs(100 - total))} %`}
        </Badge>
      </Flex>

      <Flex height="10px" mb="4" style={{ borderRadius: 'var(--radius-thumb)', overflow: 'hidden', background: 'var(--gray-a4)' }} aria-hidden="true">
        {draft.persons.map((person: DraftPerson, index: number) => (
          <Box
            key={person.id}
            style={{
              width: `${Math.max(0, Math.min(100, parseShare(person.shareText)))}%`,
              background: `var(--${PERSON_COLORS[index % PERSON_COLORS.length]}-9)`,
            }}
          />
        ))}
      </Flex>

      <Flex direction="column" gap="2">
        {draft.persons.map((person: DraftPerson, index: number) => (
          <Flex key={person.id} align="center" gap="2">
            <Box
              width="10px"
              height="10px"
              flexShrink="0"
              style={{ borderRadius: '9999px', background: `var(--${PERSON_COLORS[index % PERSON_COLORS.length]}-9)` }}
            />
            {readOnly ? (
              <>
                <PersonAvatar name={person.name} size="1" />
                <Text size="2" weight="medium" style={{ flex: 1 }}>
                  {person.name}
                </Text>
                <Text size="2" className="tabular">
                  {person.shareText} %
                </Text>
              </>
            ) : (
              <>
                <Box flexGrow="1" minWidth="0">
                  <TextField.Root
                    aria-label={`Nom de la personne ${index + 1}`}
                    placeholder="Prénom"
                    maxLength={60}
                    color={showErrors && person.name.trim() === '' ? 'red' : undefined}
                    variant={showErrors && person.name.trim() === '' ? 'soft' : 'surface'}
                    value={person.name}
                    onChange={(event) => updatePerson(person.id, { name: event.target.value })}
                  />
                </Box>
                <Box width="96px" flexShrink="0">
                  <TextField.Root
                    aria-label={`Part de ${person.name || `la personne ${index + 1}`} en pourcentage`}
                    inputMode="decimal"
                    className="tabular"
                    value={person.shareText}
                    onChange={(event) => updatePerson(person.id, { shareText: event.target.value })}
                  >
                    <TextField.Slot side="right">%</TextField.Slot>
                  </TextField.Root>
                </Box>
                <IconButton
                  variant="ghost"
                  color="gray"
                  aria-label={`Retirer ${person.name || `la personne ${index + 1}`}`}
                  disabled={draft.persons.length <= 1}
                  onClick={() => removePerson(person.id)}
                >
                  <TrashIcon />
                </IconButton>
              </>
            )}
          </Flex>
        ))}
      </Flex>

      {!readOnly && (
        <Flex direction="column" gap="2" mt="3">
          <Flex gap="2" wrap="wrap">
            <Button size="1" variant="ghost" onClick={addPerson} disabled={draft.persons.length >= 10}>
              <PlusIcon /> Ajouter une personne
            </Button>
            {draft.persons.length > 1 && (
              <Button size="1" variant="ghost" color="gray" onClick={() => applyShares(equalShares(draft.persons.length))}>
                Parts égales
              </Button>
            )}
          </Flex>
          {prorata && prorataDiffers && (
            <Text size="1" color="gray">
              Au prorata des revenus, ce serait {prorata.map((share: number) => `${formatShare(share)} %`).join(' / ')}.{' '}
              <Link asChild size="1">
                <button type="button" onClick={() => applyShares(prorata)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  Appliquer
                </button>
              </Link>
            </Text>
          )}
        </Flex>
      )}
    </Card>
  );
}
