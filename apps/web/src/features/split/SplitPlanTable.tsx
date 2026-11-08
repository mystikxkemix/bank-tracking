import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Card, Flex, Grid, IconButton, Select, Text, TextField } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { monthlyAmountCents, SPLIT_FREQUENCIES, type SplitFrequency, type SplitLineKind, type SplitPersonResult, type SplitResult } from '@bank/shared';
import { AmountField } from '../../components/AmountField';
import { Money } from '../../components/Money';
import { FREQUENCY_LABELS, LINE_KIND_LABELS, newLineId, parseShare, type DraftIncome, type DraftLine, type DraftPerson, type SplitDraft } from './splitDraft';

interface SplitPlanTableProps {
  draft: SplitDraft;
  result: SplitResult;
  readOnly: boolean;
  showErrors: boolean;
  onChange: (draft: SplitDraft) => void;
}

/** Shown in a person column where the value does not apply (income of someone else). */
const EMPTY_CELL: ReactNode = (
  <Text color="gray" aria-hidden="true">
    ·
  </Text>
);

/**
 * The spreadsheet of direction 2: one row per income / joint line, its monthly equivalent and, on wide screens,
 * one column per person. Each row is its own Grid sharing the same template so columns line up; on mobile a row
 * wraps into label / (frequency + amount) / monthly equivalent and person columns are hidden (the result cards cover them).
 */
export function SplitPlanTable({ draft, result, readOnly, showErrors, onChange }: SplitPlanTableProps) {
  const personCount: number = draft.persons.length;
  const actionColumn: string = readOnly ? '' : ' 32px';
  const columns = {
    initial: readOnly ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr) minmax(0, 1fr) auto',
    sm: `minmax(140px, 1fr) 130px 120px 110px${actionColumn}`,
    lg: `minmax(140px, 1fr) 130px 120px 110px repeat(${personCount}, 96px)${actionColumn}`,
  };
  const shares: number[] = draft.persons.map((person: DraftPerson) => parseShare(person.shareText));
  const resultByPerson: Map<string, SplitPersonResult> = new Map();
  for (const personResult of result.persons) {
    resultByPerson.set(personResult.personId, personResult);
  }

  const updateIncome = (id: string, patch: Partial<DraftIncome>): void => {
    onChange({ ...draft, incomes: draft.incomes.map((income: DraftIncome) => (income.id === id ? { ...income, ...patch } : income)) });
  };
  const updateLine = (id: string, patch: Partial<DraftLine>): void => {
    onChange({ ...draft, lines: draft.lines.map((line: DraftLine) => (line.id === id ? { ...line, ...patch } : line)) });
  };
  const addIncome = (): void => {
    const personId: string = draft.persons[0]?.id ?? '';
    onChange({ ...draft, incomes: [...draft.incomes, { id: newLineId(), personId, label: 'Salaire', amountCents: null }] });
  };
  const addLine = (kind: SplitLineKind): void => {
    onChange({ ...draft, lines: [...draft.lines, { id: newLineId(), label: '', kind, amountCents: null, frequency: 'monthly' }] });
  };

  /** Per-person cells, only on wide screens. */
  const personCells = (render: (person: DraftPerson, index: number) => ReactNode): ReactNode =>
    draft.persons.map((person: DraftPerson, index: number) => (
      <Box key={person.id} display={{ initial: 'none', lg: 'block' }} style={{ textAlign: 'right' }}>
        {render(person, index)}
      </Box>
    ));

  const shareOf = (monthlyCents: number, index: number): ReactNode => (
    <Text size="2" color="gray">
      <Money cents={Math.round((monthlyCents * (shares[index] ?? 0)) / 100)} />
    </Text>
  );

  const deleteCell = (label: string, onDelete: () => void): ReactNode =>
    readOnly ? null : (
      <Flex gridColumn={{ initial: '3', sm: 'auto' }} gridRow={{ initial: '1', sm: 'auto' }} align="center" justify="center">
        <IconButton variant="ghost" color="gray" aria-label={`Supprimer ${label}`} onClick={onDelete}>
          <TrashIcon />
        </IconButton>
      </Flex>
    );

  const labelCell = (value: string, placeholder: string, ariaLabel: string, onEdit: (value: string) => void, sub: ReactNode): ReactNode => (
    <Box gridColumn={readOnly ? 'auto' : { initial: '1 / 3', sm: 'auto' }} minWidth="0">
      {readOnly ? (
        <>
          <Text size="2">{value}</Text>
          <Box display={{ initial: 'block', sm: 'none' }}>{sub}</Box>
        </>
      ) : (
        <TextField.Root
          aria-label={ariaLabel}
          placeholder={placeholder}
          maxLength={80}
          color={showErrors && value.trim() === '' ? 'red' : undefined}
          variant={showErrors && value.trim() === '' ? 'soft' : 'surface'}
          value={value}
          onChange={(event) => onEdit(event.target.value)}
        />
      )}
    </Box>
  );

  const amountCell = (amountCents: number | null, ariaLabel: string, onEdit: (cents: number | null) => void): ReactNode => (
    <Box display={readOnly ? { initial: 'none', sm: 'block' } : undefined} style={{ textAlign: 'right' }}>
      {readOnly ? (
        <Text size="2">
          <Money cents={amountCents ?? 0} />
        </Text>
      ) : (
        <AmountField value={amountCents} onChange={onEdit} aria-label={ariaLabel} />
      )}
    </Box>
  );

  const perMonthCell = (monthlyCents: number, hint: string | null, colored: boolean): ReactNode => (
    <Box gridColumn={readOnly ? 'auto' : { initial: '1 / -1', sm: 'auto' }} style={{ textAlign: 'right' }}>
      <Flex direction={{ initial: 'row', sm: 'column' }} justify={{ initial: 'end', sm: 'start' }} align={{ initial: 'baseline', sm: 'end' }} gap={{ initial: '2', sm: '0' }}>
        {!readOnly && (
          <Box as="span" display={{ initial: 'inline', sm: 'none' }}>
            <Text size="2" color="gray">
              soit
            </Text>
          </Box>
        )}
        <Text size="2" weight="medium">
          <Money cents={monthlyCents} colored={colored} />
          <Box as="span" display={{ initial: 'inline', sm: 'none' }}>
            <Text color="gray"> / mois</Text>
          </Box>
        </Text>
        {hint && (
          <Text size="1" color="gray">
            {hint}
          </Text>
        )}
      </Flex>
    </Box>
  );

  const rowStyle = { borderTop: '1px solid var(--gray-a4)' };

  const incomeRow = (income: DraftIncome): ReactNode => {
    const owner: DraftPerson | undefined = draft.persons.find((person: DraftPerson) => person.id === income.personId);
    return (
      <Grid key={income.id} columns={columns} gap="3" align="center" px="3" py="2" style={rowStyle}>
        {labelCell(income.label, 'Ex : Salaire', 'Libellé du revenu', (label: string) => updateIncome(income.id, { label }), (
          <Text size="1" color="gray">
            {owner?.name}
          </Text>
        ))}
        <Box display={readOnly ? { initial: 'none', sm: 'block' } : undefined}>
          {readOnly ? (
            <Text size="2" color="gray">
              {owner?.name}
            </Text>
          ) : (
            <Select.Root value={income.personId} onValueChange={(personId: string) => updateIncome(income.id, { personId })}>
              <Select.Trigger aria-label="Personne qui reçoit ce revenu" style={{ width: '100%' }} />
              <Select.Content>
                {draft.persons.map((person: DraftPerson, index: number) => (
                  <Select.Item key={person.id} value={person.id}>
                    {person.name.trim() || `Personne ${index + 1}`}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Box>
        {amountCell(income.amountCents, `Montant de ${income.label || 'ce revenu'}`, (amountCents: number | null) => updateIncome(income.id, { amountCents }))}
        {perMonthCell(income.amountCents ?? 0, null, true)}
        {personCells((person: DraftPerson) =>
          person.id === income.personId ? (
            <Text size="2">
              <Money cents={income.amountCents ?? 0} colored />
            </Text>
          ) : (
            EMPTY_CELL
          ),
        )}
        {deleteCell(income.label || 'ce revenu', () => onChange({ ...draft, incomes: draft.incomes.filter((item: DraftIncome) => item.id !== income.id) }))}
      </Grid>
    );
  };

  const lineRow = (line: DraftLine): ReactNode => {
    const monthly: number = monthlyAmountCents({ amountCents: line.amountCents ?? 0, frequency: line.frequency });
    const hint: string | null = line.frequency === 'monthly' ? null : line.kind === 'charge' ? 'provision' : 'lissé';
    return (
      <Grid key={line.id} columns={columns} gap="3" align="center" px="3" py="2" style={rowStyle}>
        {labelCell(line.label, LINE_KIND_LABELS[line.kind].placeholder, 'Libellé de la ligne', (label: string) => updateLine(line.id, { label }), (
          <Text size="1" color="gray">
            {FREQUENCY_LABELS[line.frequency]} · <Money cents={line.amountCents ?? 0} />
          </Text>
        ))}
        <Box display={readOnly ? { initial: 'none', sm: 'block' } : undefined}>
          {readOnly ? (
            <Text size="2" color="gray">
              {FREQUENCY_LABELS[line.frequency]}
            </Text>
          ) : (
            <Select.Root value={line.frequency} onValueChange={(frequency: string) => updateLine(line.id, { frequency: frequency as SplitFrequency })}>
              <Select.Trigger aria-label={`Fréquence de ${line.label || 'la ligne'}`} style={{ width: '100%' }} />
              <Select.Content>
                {SPLIT_FREQUENCIES.map((frequency: SplitFrequency) => (
                  <Select.Item key={frequency} value={frequency}>
                    {FREQUENCY_LABELS[frequency]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Box>
        {amountCell(line.amountCents, `Montant de ${line.label || 'la ligne'}`, (amountCents: number | null) => updateLine(line.id, { amountCents }))}
        {perMonthCell(monthly, hint, false)}
        {personCells((_person: DraftPerson, index: number) => shareOf(monthly, index))}
        {deleteCell(line.label || 'la ligne', () => onChange({ ...draft, lines: draft.lines.filter((item: DraftLine) => item.id !== line.id) }))}
      </Grid>
    );
  };

  /** Subtotal / total rows: label over the first columns, value under "Par mois", per-person values. */
  const totalRow = (label: string, valueCents: number, perPerson: (person: DraftPerson, index: number) => ReactNode, highlight: boolean): ReactNode => (
    <Grid
      columns={columns}
      gap="3"
      align="center"
      px="3"
      py="2"
      style={highlight ? { ...rowStyle, background: 'var(--accent-a3)' } : { ...rowStyle, background: 'var(--gray-a2)' }}
    >
      <Box gridColumn={readOnly ? '1' : { initial: '1 / 3', sm: '1 / 4' }}>
        <Text size="2" weight="bold" className={highlight ? 'text-accent' : undefined}>
          {label}
        </Text>
      </Box>
      <Box gridColumn={readOnly ? { initial: 'auto', sm: '4' } : 'auto'} style={{ textAlign: 'right' }}>
        <Text size="2" weight="bold" className={highlight ? 'text-accent' : undefined}>
          <Money cents={valueCents} />
        </Text>
      </Box>
      {personCells(perPerson)}
      {!readOnly && <Box display={{ initial: 'none', sm: 'block' }} />}
    </Grid>
  );

  const sectionHeader = (title: string, count: number): ReactNode => (
    <Flex px="3" py="2" style={{ ...rowStyle, background: 'var(--gray-a2)' }}>
      <Text size="1" weight="medium" color="gray">
        {title} · {count}
      </Text>
    </Flex>
  );

  const addButton = (label: string, onClick: () => void): ReactNode =>
    readOnly ? null : (
      <Box px="3" py="2" style={rowStyle}>
        <Button size="1" variant="ghost" onClick={onClick} disabled={draft.persons.length === 0}>
          <PlusIcon /> {label}
        </Button>
      </Box>
    );

  const charges: DraftLine[] = draft.lines.filter((line: DraftLine) => line.kind === 'charge');
  const savings: DraftLine[] = draft.lines.filter((line: DraftLine) => line.kind === 'savings');

  return (
    <Card size="1" style={{ padding: 0, overflowX: 'auto' }}>
      <Grid columns={columns} gap="3" px="3" py="2" display={{ initial: 'none', sm: 'grid' }}>
        <Text size="1" weight="medium" color="gray">
          Ligne
        </Text>
        <Text size="1" weight="medium" color="gray">
          Personne / fréquence
        </Text>
        <Text size="1" weight="medium" color="gray" align="right">
          Montant
        </Text>
        <Text size="1" weight="medium" color="gray" align="right">
          Par mois
        </Text>
        {personCells((person: DraftPerson, index: number) => (
          <Flex justify="end" align="center" gap="1">
            <Text size="1" weight="medium" truncate>
              {person.name.trim() || `Personne ${index + 1}`}
            </Text>
            <Badge size="1" variant="soft">
              {person.shareText} %
            </Badge>
          </Flex>
        ))}
        {!readOnly && <Box />}
      </Grid>

      {sectionHeader('Revenus', draft.incomes.length)}
      {draft.incomes.map(incomeRow)}
      {addButton('Ajouter un revenu', addIncome)}

      {sectionHeader(LINE_KIND_LABELS.charge.section, charges.length)}
      {charges.map(lineRow)}
      {addButton(LINE_KIND_LABELS.charge.add, () => addLine('charge'))}
      {totalRow('Charges lissées', result.monthlyChargesCents, (_person: DraftPerson, index: number) => shareOf(result.monthlyChargesCents, index), false)}

      {sectionHeader(LINE_KIND_LABELS.savings.section, savings.length)}
      {savings.map(lineRow)}
      {addButton(LINE_KIND_LABELS.savings.add, () => addLine('savings'))}

      {totalRow(
        'À garder sur le compte commun',
        result.keepOnJointCents,
        (person: DraftPerson) => (
          <Text size="2" weight="bold" className="text-accent">
            <Money cents={resultByPerson.get(person.id)?.contributionCents ?? 0} />
          </Text>
        ),
        true,
      )}
      <Grid columns={columns} gap="3" align="center" px="3" py="2" display={{ initial: 'none', lg: 'grid' }} style={rowStyle}>
        <Box gridColumn="1 / 5">
          <Text size="2" weight="bold">
            À renvoyer sur le compte perso
          </Text>
        </Box>
        {personCells((person: DraftPerson) => {
          const returnCents: number = resultByPerson.get(person.id)?.returnCents ?? 0;
          return (
            <Badge color={returnCents < 0 ? 'red' : 'green'} size="2">
              <Money cents={returnCents} />
            </Badge>
          );
        })}
        {!readOnly && <Box />}
      </Grid>
    </Card>
  );
}
