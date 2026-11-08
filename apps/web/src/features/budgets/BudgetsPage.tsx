import { Cross2Icon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Callout, Card, Flex, IconButton, Skeleton, Spinner, Table, Text } from '@radix-ui/themes';
import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { Budget, BudgetStatus, Category, CategoryTotal, MonthSummary } from '@bank/shared';
import { AmountField } from '../../components/AmountField';
import { CategoryBadge } from '../../components/CategoryBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { HeroStrip, type HeroStat } from '../../components/HeroStrip';
import { MonthHeader } from '../../components/MonthHeader';
import { formatMonth, formatPercent } from '../../lib/format';
import { spaceUrl, useCurrentSpace } from '../../lib/space';
import { useMonthParam } from '../../lib/useMonthParam';
import { useCategories } from '../categories/api';
import { useMonthSummary } from '../dashboard/api';
import { useDeleteBudget, usePutBudget, useBudgets } from './api';
import { BUDGET_STATE_ORDER, BUDGET_STATES, BudgetBar, budgetState, type BudgetState } from './BudgetBar';
import { monthProgress, type MonthProgress } from '../../lib/monthProgress';

interface BudgetRow {
  category: Category;
  limitCents: number;
  spentCents: number;
  /** limit - spent, negative when over. */
  leftCents: number;
  state: BudgetState;
}

interface UnbudgetedRow {
  category: Category;
  spentCents: number;
}

interface BudgetTotals {
  limitCents: number;
  spentCents: number;
  leftCents: number;
  overCount: number;
}

/** Joins limits (useBudgets), spent amounts of the month (stats) and expense categories. */
function buildRows(categories: Category[], budgets: Budget[], summary: MonthSummary | undefined): { rows: BudgetRow[]; unbudgeted: UnbudgetedRow[] } {
  const spentByBudget: Map<string, number> = new Map();
  for (const status of summary?.budgets ?? ([] as BudgetStatus[])) {
    spentByBudget.set(status.categoryId, status.spentCents);
  }
  // Category totals are signed (expenses negative): spending is the opposite, refunds can make it drop.
  const spentByCategory: Map<string, number> = new Map();
  for (const total of summary?.byCategory ?? ([] as CategoryTotal[])) {
    if (total.categoryId) {
      spentByCategory.set(total.categoryId, Math.max(0, -total.totalCents));
    }
  }
  const limitByCategory: Map<string, number> = new Map();
  for (const budget of budgets) {
    limitByCategory.set(budget.categoryId, budget.monthlyLimitCents);
  }

  const rows: BudgetRow[] = [];
  const unbudgeted: UnbudgetedRow[] = [];
  for (const category of categories) {
    if (category.kind !== 'expense') {
      continue;
    }
    const limitCents: number | undefined = limitByCategory.get(category.id);
    if (limitCents === undefined) {
      unbudgeted.push({ category, spentCents: spentByCategory.get(category.id) ?? 0 });
      continue;
    }
    const spentCents: number = spentByBudget.get(category.id) ?? spentByCategory.get(category.id) ?? 0;
    rows.push({ category, limitCents, spentCents, leftCents: limitCents - spentCents, state: budgetState(spentCents, limitCents) });
  }
  unbudgeted.sort((a: UnbudgetedRow, b: UnbudgetedRow) => b.spentCents - a.spentCents || a.category.name.localeCompare(b.category.name, 'fr'));
  return { rows, unbudgeted };
}

function computeTotals(rows: BudgetRow[]): BudgetTotals {
  const totals: BudgetTotals = { limitCents: 0, spentCents: 0, leftCents: 0, overCount: 0 };
  for (const row of rows) {
    totals.limitCents += row.limitCents;
    totals.spentCents += row.spentCents;
    if (row.state === 'over') {
      totals.overCount += 1;
    }
  }
  totals.leftCents = totals.limitCents - totals.spentCents;
  return totals;
}

/** Rows of one state, most room left first (the draft orders "Disponible" that way, and it puts the worst overruns first). */
function groupRows(rows: BudgetRow[]): { state: BudgetState; rows: BudgetRow[] }[] {
  const groups: { state: BudgetState; rows: BudgetRow[] }[] = [];
  for (const state of BUDGET_STATE_ORDER) {
    const inState: BudgetRow[] = rows.filter((row: BudgetRow) => row.state === state);
    if (inState.length > 0) {
      inState.sort((a: BudgetRow, b: BudgetRow) => (state === 'ok' ? b.leftCents - a.leftCents : a.leftCents - b.leftCents));
      groups.push({ state, rows: inState });
    }
  }
  return groups;
}

/** Budgets page (direction 2 "Budget d'abord"): what is left to spend first, then one row per budgeted category. */
export function BudgetsPage() {
  const { space, canEdit } = useCurrentSpace();
  const [month, setMonth] = useMonthParam();
  const budgets = useBudgets();
  const categories = useCategories();
  const summary = useMonthSummary(month);
  const deleteBudget = useDeleteBudget();
  const progress: MonthProgress | null = monthProgress(month);

  const header: ReactNode = (
    <MonthHeader title="Budgets" description="Un plafond par catégorie de dépenses, le même chaque mois." month={month} onChange={setMonth} />
  );

  if (budgets.isPending || categories.isPending) {
    return (
      <>
        {header}
        <Flex direction="column" gap="4">
          <Skeleton height="140px" />
          <Skeleton height="320px" />
        </Flex>
      </>
    );
  }
  if (budgets.isError || categories.isError) {
    return (
      <>
        {header}
        <ErrorCallout error={budgets.error ?? categories.error} />
      </>
    );
  }

  const { rows, unbudgeted } = buildRows(categories.data, budgets.data, summary.data);
  const totals: BudgetTotals = computeTotals(rows);
  const hasExpenseCategories: boolean = rows.length + unbudgeted.length > 0;
  const uncategorizedCount: number = summary.data?.uncategorizedCount ?? 0;

  return (
    <>
      {header}
      <Flex direction="column" gap="4">
        <ErrorCallout error={summary.error ?? deleteBudget.error} />

        {!hasExpenseCategories ? (
          <Card>
            <EmptyState
              icon="🏷️"
              title="Aucune catégorie de dépenses"
              description="Les budgets se fixent sur des catégories de type « Dépense ». Crée-les dans les réglages de l'espace."
              action={
                canEdit ? (
                  <Button asChild>
                    <Link to={spaceUrl(space.id, '/settings?tab=categories')}>Gérer les catégories</Link>
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              icon="🎯"
              title="Aucun budget pour l'instant"
              description={
                canEdit
                  ? 'Fixe un plafond mensuel sur les catégories que tu veux surveiller (courses, restaurants...). Choisis-les dans la liste ci-dessous.'
                  : "Les personnes qui gèrent cet espace n'ont pas encore fixé de plafond."
              }
            />
          </Card>
        ) : (
          <>
            <BudgetHero totals={totals} budgetCount={rows.length} progress={progress} loading={summary.isPending} />
            {uncategorizedCount > 0 && (
              <Callout.Root color="amber" size="1">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Flex asChild justify="between" align="center" gap="3" wrap="wrap" width="100%">
                  <Callout.Text>
                    <span>
                      {uncategorizedCount} transaction{uncategorizedCount > 1 ? 's' : ''} non catégorisée{uncategorizedCount > 1 ? 's' : ''} en{' '}
                      {formatMonth(month)} ne compte{uncategorizedCount > 1 ? 'nt' : ''} dans aucun budget.
                    </span>
                    {canEdit && (
                      <Button asChild size="1" variant="soft" color="amber">
                        <Link to={spaceUrl(space.id, '/review')}>Catégoriser</Link>
                      </Button>
                    )}
                  </Callout.Text>
                </Flex>
              </Callout.Root>
            )}
            <BudgetTable rows={rows} totals={totals} progress={progress} canEdit={canEdit} onDelete={(categoryId: string) => deleteBudget.mutate(categoryId)} />
          </>
        )}

        {unbudgeted.length > 0 && <UnbudgetedCard rows={unbudgeted} canEdit={canEdit} hasBudgets={rows.length > 0} />}
      </Flex>
    </>
  );
}

/** "Reste à dépenser" first, then budgeted / spent / per day, and the month bar with the "today" tick. */
function BudgetHero({ totals, budgetCount, progress, loading }: { totals: BudgetTotals; budgetCount: number; progress: MonthProgress | null; loading: boolean }) {
  const over: boolean = totals.leftCents < 0;
  const spentRatio: number | null = totals.limitCents > 0 ? totals.spentCents / totals.limitCents : null;
  const perDayCents: number | null = progress && !over ? Math.floor(totals.leftCents / progress.daysLeft) : null;
  const stats: HeroStat[] = [
    { label: 'Budgété', value: <Money cents={totals.limitCents} /> },
    { label: 'Dépensé', value: <Money cents={totals.spentCents} />, sub: `${formatPercent(spentRatio)} du budget` },
  ];
  if (progress) {
    stats.push({
      label: 'Par jour',
      value: perDayCents === null ? '-' : <Money cents={perDayCents} />,
      sub: `${progress.daysLeft} jour${progress.daysLeft > 1 ? 's' : ''} restant${progress.daysLeft > 1 ? 's' : ''}`,
    });
  }

  return (
    <HeroStrip
      main={{
        label: over ? 'Budgets dépassés de' : 'Reste à dépenser',
        tone: over ? 'red' : 'accent',
        value: (
          <Skeleton loading={loading}>
            <Money cents={Math.abs(totals.leftCents)} />
          </Skeleton>
        ),
        sub: `sur ${budgetCount} budget${budgetCount > 1 ? 's' : ''}${totals.overCount > 0 ? `, dont ${totals.overCount} dépassé${totals.overCount > 1 ? 's' : ''}` : ''}`,
      }}
      stats={stats}
      footer={
        <>
          <BudgetBar spentCents={totals.spentCents} limitCents={totals.limitCents} todayRatio={progress?.ratio ?? null} label="Total des budgets" height={10} />
          <Flex justify="between" mt="2" gap="3" wrap="wrap">
            <Text size="1" color="gray">
              {formatPercent(spentRatio)} dépensé
            </Text>
            {progress && (
              <Text size="1" color="gray">
                Trait = aujourd'hui, {formatPercent(progress.ratio)} du mois écoulé
              </Text>
            )}
          </Flex>
        </>
      }
    />
  );
}

function RemainingBadge({ leftCents, state }: { leftCents: number; state: BudgetState }) {
  return (
    <Badge color={BUDGET_STATES[state].badgeColor} variant="soft" size="2" radius="full" className="tabular">
      {leftCents < 0 ? (
        <>
          Dépassé de
          <Money cents={-leftCents} />
        </>
      ) : (
        <>
          <Money cents={leftCents} />
          restants
        </>
      )}
    </Badge>
  );
}

function GroupLabel({ state, count }: { state: BudgetState; count: number }) {
  return (
    <Flex align="center" gap="2">
      <Box width="8px" height="8px" style={{ borderRadius: '9999px', background: BUDGET_STATES[state].cssColor }} />
      <Text size="1" weight="medium" color="gray">
        {BUDGET_STATES[state].label} · {count}
      </Text>
    </Flex>
  );
}

interface BudgetTableProps {
  rows: BudgetRow[];
  totals: BudgetTotals;
  progress: MonthProgress | null;
  canEdit: boolean;
  onDelete: (categoryId: string) => void;
}

/** Table grouped by state on desktop, stacked cards on mobile. */
function BudgetTable({ rows, totals, progress, canEdit, onDelete }: BudgetTableProps) {
  const groups: { state: BudgetState; rows: BudgetRow[] }[] = groupRows(rows);
  const todayRatio: number | null = progress?.ratio ?? null;
  const columnCount: number = canEdit ? 6 : 5;

  return (
    <>
      <Box display={{ initial: 'none', sm: 'block' }}>
        <Card size="1">
          <Table.Root size="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Catégorie</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Budget</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Dépensé</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Reste</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="22%">Progression</Table.ColumnHeaderCell>
                {canEdit && <Table.ColumnHeaderCell width="1%" />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((group) => (
                <GroupRows key={group.state} group={group} columnCount={columnCount} todayRatio={todayRatio} canEdit={canEdit} onDelete={onDelete} />
              ))}
              <Table.Row align="center">
                <Table.RowHeaderCell>
                  <Text weight="bold">Total</Text>
                </Table.RowHeaderCell>
                <Table.Cell justify="end">
                  <Money cents={totals.limitCents} weight="bold" />
                </Table.Cell>
                <Table.Cell justify="end">
                  <Money cents={totals.spentCents} weight="bold" />
                </Table.Cell>
                <Table.Cell justify="end">
                  <RemainingBadge leftCents={totals.leftCents} state={budgetState(totals.spentCents, totals.limitCents)} />
                </Table.Cell>
                <Table.Cell colSpan={canEdit ? 2 : 1} />
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Card>
      </Box>

      <Flex direction="column" gap="3" display={{ initial: 'flex', sm: 'none' }}>
        {groups.map((group) => (
          <Flex key={group.state} direction="column" gap="2">
            <GroupLabel state={group.state} count={group.rows.length} />
            {group.rows.map((row: BudgetRow) => (
              <BudgetCard key={row.category.id} row={row} todayRatio={todayRatio} canEdit={canEdit} onDelete={onDelete} />
            ))}
          </Flex>
        ))}
        <Card>
          <Flex justify="between" align="center" gap="3">
            <Box>
              <Text as="div" weight="bold">
                Total
              </Text>
              <Text as="div" size="1" color="gray">
                <Money cents={totals.spentCents} /> sur <Money cents={totals.limitCents} />
              </Text>
            </Box>
            <RemainingBadge leftCents={totals.leftCents} state={budgetState(totals.spentCents, totals.limitCents)} />
          </Flex>
        </Card>
      </Flex>
    </>
  );
}

function GroupRows({
  group,
  columnCount,
  todayRatio,
  canEdit,
  onDelete,
}: {
  group: { state: BudgetState; rows: BudgetRow[] };
  columnCount: number;
  todayRatio: number | null;
  canEdit: boolean;
  onDelete: (categoryId: string) => void;
}) {
  return (
    <>
      <Table.Row style={{ background: 'var(--gray-a2)' }}>
        <Table.Cell colSpan={columnCount} py="2">
          <GroupLabel state={group.state} count={group.rows.length} />
        </Table.Cell>
      </Table.Row>
      {group.rows.map((row: BudgetRow) => (
        <Table.Row key={row.category.id} align="center">
          <Table.RowHeaderCell>
            <CategoryBadge category={row.category} />
          </Table.RowHeaderCell>
          <Table.Cell justify="end">{canEdit ? <LimitField row={row} /> : <Money cents={row.limitCents} />}</Table.Cell>
          <Table.Cell justify="end">
            <Money cents={row.spentCents} />
          </Table.Cell>
          <Table.Cell justify="end">
            <RemainingBadge leftCents={row.leftCents} state={row.state} />
          </Table.Cell>
          <Table.Cell>
            <BudgetBar spentCents={row.spentCents} limitCents={row.limitCents} todayRatio={todayRatio} label={row.category.name} />
          </Table.Cell>
          {canEdit && (
            <Table.Cell>
              <RemoveBudgetButton row={row} onDelete={onDelete} />
            </Table.Cell>
          )}
        </Table.Row>
      ))}
    </>
  );
}

function BudgetCard({ row, todayRatio, canEdit, onDelete }: { row: BudgetRow; todayRatio: number | null; canEdit: boolean; onDelete: (categoryId: string) => void }) {
  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" gap="2">
          <CategoryBadge category={row.category} />
          <RemainingBadge leftCents={row.leftCents} state={row.state} />
        </Flex>
        <BudgetBar spentCents={row.spentCents} limitCents={row.limitCents} todayRatio={todayRatio} label={row.category.name} />
        <Flex justify="between" align="center" gap="2">
          <Text size="2" color="gray">
            <Money cents={row.spentCents} /> dépensés sur
          </Text>
          <Flex align="center" gap="1">
            {canEdit ? <LimitField row={row} /> : <Money cents={row.limitCents} />}
            {canEdit && <RemoveBudgetButton row={row} onDelete={onDelete} />}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}

function RemoveBudgetButton({ row, onDelete }: { row: BudgetRow; onDelete: (categoryId: string) => void }) {
  return (
    <ConfirmDialog
      title={`Retirer le budget « ${row.category.name} » ?`}
      description="Les dépenses de cette catégorie restent, seul le plafond mensuel disparaît. Tu pourras en définir un autre plus tard."
      confirmLabel="Retirer"
      onConfirm={() => onDelete(row.category.id)}
      trigger={
        <IconButton variant="ghost" color="gray" aria-label={`Retirer le budget ${row.category.name}`}>
          <TrashIcon />
        </IconButton>
      }
    />
  );
}

/** Inline limit edit: saves on blur or Enter, Escape restores the saved value. */
function LimitField({ row }: { row: BudgetRow }) {
  const putBudget = usePutBudget();
  const [value, setValue] = useState<number | null>(row.limitCents);
  const [savedValue, setSavedValue] = useState<number>(row.limitCents);

  // The limit changed on the server (save done, other device): show it, during render instead of an effect.
  if (row.limitCents !== savedValue) {
    setSavedValue(row.limitCents);
    setValue(row.limitCents);
  }

  const commit = (): void => {
    if (value === null || value <= 0) {
      setValue(row.limitCents);
      return;
    }
    if (value !== row.limitCents) {
      putBudget.mutate({ categoryId: row.category.id, body: { monthlyLimitCents: value } });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    } else if (event.key === 'Escape') {
      setValue(row.limitCents);
    }
  };

  return (
    <Flex direction="column" align="end" gap="1">
      <Flex align="center" gap="2">
        {putBudget.isPending && <Spinner size="1" />}
        <Box width="120px" onBlur={commit} onKeyDown={onKeyDown}>
          <AmountField value={value} onChange={setValue} aria-label={`Budget mensuel ${row.category.name}`} />
        </Box>
      </Flex>
      {putBudget.error && (
        <Text size="1" color="red" role="alert">
          {putBudget.error.message}
        </Text>
      )}
    </Flex>
  );
}

/** Expense categories without a limit, with what they cost this month: the place to add a budget. */
function UnbudgetedCard({ rows, canEdit, hasBudgets }: { rows: UnbudgetedRow[]; canEdit: boolean; hasBudgets: boolean }) {
  return (
    <Card size="2">
      <Flex direction="column" gap="1" mb="3">
        <Text weight="bold">{hasBudgets ? 'Hors budget' : 'Catégories de dépenses'}</Text>
        <Text size="2" color="gray">
          {canEdit ? 'Ces catégories n\'ont pas de plafond. Définis-en un pour les suivre ici.' : "Ces catégories n'ont pas de plafond."}
        </Text>
      </Flex>
      <Flex direction="column">
        {rows.map((row: UnbudgetedRow, index: number) => (
          <Flex
            key={row.category.id}
            justify="between"
            align="center"
            gap="3"
            wrap="wrap"
            py="2"
            style={index > 0 ? { borderTop: '1px solid var(--gray-a4)' } : undefined}
          >
            <Flex align="center" gap="3" wrap="wrap">
              <CategoryBadge category={row.category} />
              <Text size="2" color="gray">
                {row.spentCents > 0 ? (
                  <>
                    <Money cents={row.spentCents} /> ce mois
                  </>
                ) : (
                  'Rien ce mois'
                )}
              </Text>
            </Flex>
            {canEdit && <SetBudgetInline category={row.category} />}
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}

function SetBudgetInline({ category }: { category: Category }) {
  const putBudget = usePutBudget();
  const [editing, setEditing] = useState<boolean>(false);
  const [value, setValue] = useState<number | null>(null);

  if (!editing) {
    return (
      <Button size="1" variant="soft" onClick={() => setEditing(true)}>
        <PlusIcon /> Définir un budget
      </Button>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (value !== null && value > 0) {
      // On success the category moves to the budget table (queries invalidated), this form unmounts.
      putBudget.mutate({ categoryId: category.id, body: { monthlyLimitCents: value } });
    }
  };

  return (
    <form onSubmit={submit}>
      <Flex direction="column" align="end" gap="1">
        <Flex align="center" gap="2">
          <Box width="120px">
            <AmountField value={value} onChange={setValue} autoFocus aria-label={`Budget mensuel ${category.name}`} />
          </Box>
          <Button type="submit" size="2" loading={putBudget.isPending} disabled={value === null || value <= 0}>
            Enregistrer
          </Button>
          <IconButton type="button" variant="ghost" color="gray" aria-label="Annuler" onClick={() => setEditing(false)}>
            <Cross2Icon />
          </IconButton>
        </Flex>
        {putBudget.error && (
          <Text size="1" color="red" role="alert">
            {putBudget.error.message}
          </Text>
        )}
      </Flex>
    </form>
  );
}
