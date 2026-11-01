import { ArrowRightIcon, CheckCircledIcon, ExclamationTriangleIcon, UploadIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Callout, Card, Flex, Grid, Heading, Link, Progress, Skeleton, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { addMonths, type Account, type BudgetStatus, type Category, type Goal, type MonthlyStat, type MonthSummary, type Transaction } from '@bank/shared';
import { CategoryBadge } from '../../components/CategoryBadge';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { MonthHeader } from '../../components/MonthHeader';
import { PageHeader } from '../../components/PageHeader';
import { formatCents, formatDay, formatMonth, formatPercent } from '../../lib/format';
import { spaceUrl, useCurrentSpace } from '../../lib/space';
import { useMonthParam } from '../../lib/useMonthParam';
import { useAccounts } from '../accounts/api';
import { useCategoriesById } from '../categories/api';
import { useGoals } from '../goals/api';
import { useTransactions } from '../transactions/api';
import { useMonthlyStats, useMonthSummary } from './api';
import { buildSpendingSlices, SpendingDonut, type SpendingSlice } from './SpendingDonut';
import { TrendChart } from './TrendChart';

/** KPI numbers: smaller on phones so "+5 623,40 €" fits a half-width card. */
const KPI_SIZE: { initial: '5'; md: '6' } = { initial: '5', md: '6' };

/** Budgets shown on the dashboard: at least this share of the limit spent. */
const BUDGET_ALERT_RATIO: number = 0.8;

/** Home of a space (design direction 1): how the month goes, where the money goes, what needs attention. */
export function DashboardPage() {
  const { space, canEdit } = useCurrentSpace();
  const [month, setMonth] = useMonthParam();
  const accounts = useAccounts();
  const summary = useMonthSummary(month);
  const stats = useMonthlyStats(12, month);
  const uncategorized = useTransactions({ categoryId: 'none', pageSize: 1 });

  const accountList: Account[] = accounts.data ?? [];
  const transactionCount: number = sumTransactions(accountList);

  const header: ReactNode = (
    <MonthHeader
      title="Tableau de bord"
      month={month}
      onChange={setMonth}
      actions={
        // On desktop the top bar already has "Importer": only phones need this shortcut.
        canEdit && (
          <Box display={{ initial: 'block', md: 'none' }}>
            <Button asChild variant="surface">
              <RouterLink to={spaceUrl(space.id, '/import')}>
                <UploadIcon /> Importer un relevé
              </RouterLink>
            </Button>
          </Box>
        )
      }
    />
  );

  if (accounts.isPending) {
    return (
      <>
        {header}
        <DashboardSkeleton />
      </>
    );
  }
  if (accounts.isError) {
    return (
      <>
        {header}
        <ErrorCallout error={accounts.error} />
      </>
    );
  }
  if (accountList.length === 0 || transactionCount === 0) {
    return (
      <>
        <PageHeader title="Tableau de bord" description={space.name} />
        <Onboarding hasAccount={accountList.length > 0} />
      </>
    );
  }

  const uncategorizedCount: number = uncategorized.data?.total ?? 0;

  return (
    <>
      {header}
      <Flex direction="column" gap="4">
        {canEdit && uncategorizedCount > 0 && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Flex asChild align="center" justify="between" gap="3" wrap="wrap" width="100%">
              <Callout.Text>
                <span>
                  <strong>
                    {uncategorizedCount} transaction{uncategorizedCount > 1 ? 's' : ''}
                  </strong>{' '}
                  {uncategorizedCount > 1 ? 'attendent' : 'attend'} une catégorie. Tant qu'elles ne sont pas classées, tes budgets sont incomplets.
                </span>
                <Button size="1" asChild>
                  <RouterLink to={spaceUrl(space.id, '/review')}>
                    Catégoriser maintenant <ArrowRightIcon />
                  </RouterLink>
                </Button>
              </Callout.Text>
            </Flex>
          </Callout.Root>
        )}

        <ErrorCallout error={summary.error ?? stats.error} />
        <KpiCards summary={summary.data} stats={stats.data} month={month} />

        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          <SpendingCard summary={summary.data} month={month} />
          <Card size="2">
            <Heading size="3" mb="3">
              Revenus et dépenses sur 12 mois
            </Heading>
            {stats.data ? <TrendChart stats={stats.data} selectedMonth={month} onSelectMonth={setMonth} /> : <Skeleton height="260px" />}
          </Card>
        </Grid>

        <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
          <BudgetsCard summary={summary.data} month={month} />
          <GoalsCard />
          <LatestTransactionsCard month={month} />
        </Grid>
      </Flex>
    </>
  );
}

function KpiCards({ summary, stats, month }: { summary: MonthSummary | undefined; stats: MonthlyStat[] | undefined; month: string }) {
  const previousMonth: string = addMonths(month, -1);
  const previous: MonthlyStat | undefined = stats?.find((stat: MonthlyStat) => stat.month === previousMonth);
  const hasPrevious: boolean = Boolean(previous && (previous.incomeCents > 0 || previous.expenseCents > 0));
  const previousLabel: string = `vs ${formatMonth(previousMonth).split(' ')[0]}`;

  if (!summary) {
    return (
      <Grid columns={{ initial: '2', md: '4' }} gap="3">
        {[0, 1, 2, 3].map((index: number) => (
          <Skeleton key={index} height="108px" />
        ))}
      </Grid>
    );
  }

  return (
    <Grid columns={{ initial: '2', md: '4' }} gap="3">
      <Kpi label="Revenus" value={<Money cents={summary.incomeCents} colored size={KPI_SIZE} weight="bold" />} foot={hasPrevious && previous ? <Delta current={summary.incomeCents} previous={previous.incomeCents} goodWhenUp label={previousLabel} /> : null} />
      <Kpi label="Dépenses" value={<Money cents={summary.expenseCents} size={KPI_SIZE} weight="bold" />} foot={hasPrevious && previous ? <Delta current={summary.expenseCents} previous={previous.expenseCents} goodWhenUp={false} label={previousLabel} /> : null} />
      <Kpi
        label="Épargne du mois"
        value={<Money cents={summary.netCents} colored size={KPI_SIZE} weight="bold" />}
        foot={
          <Text size="1" color="gray">
            Revenus moins dépenses
          </Text>
        }
      />
      <Kpi
        label="Taux d'épargne"
        value={
          <Text size={KPI_SIZE} weight="bold" className="tabular" color={summary.savingsRate !== null && summary.savingsRate < 0 ? 'red' : undefined}>
            {formatPercent(summary.savingsRate)}
          </Text>
        }
        foot={
          <Text size="1" color="gray">
            {summary.savingsRate === null ? 'Pas de revenu ce mois-ci' : 'de tes revenus mis de côté'}
          </Text>
        }
      />
    </Grid>
  );
}

function Kpi({ label, value, foot }: { label: string; value: ReactNode; foot: ReactNode }) {
  return (
    <Card size="2">
      <Text as="div" size="2" color="gray" mb="1">
        {label}
      </Text>
      <Box mb="1">{value}</Box>
      <Box minHeight="20px">{foot}</Box>
    </Card>
  );
}

/** "↑ 12 % vs septembre": arrow + sign so color is not the only signal. */
function Delta({ current, previous, goodWhenUp, label }: { current: number; previous: number; goodWhenUp: boolean; label: string }) {
  if (previous === 0) {
    return null;
  }
  const ratio: number = (current - previous) / previous;
  if (Math.abs(ratio) < 0.005) {
    return (
      <Text size="1" color="gray">
        = stable {label}
      </Text>
    );
  }
  const up: boolean = ratio > 0;
  const good: boolean = up === goodWhenUp;
  return (
    <Flex align="center" gap="1" wrap="wrap">
      <Badge color={good ? 'grass' : 'red'} size="1">
        {up ? '↑' : '↓'} {formatPercent(Math.abs(ratio))}
      </Badge>
      <Text size="1" color="gray">
        {label}
      </Text>
    </Flex>
  );
}

function SpendingCard({ summary, month }: { summary: MonthSummary | undefined; month: string }) {
  const { space } = useCurrentSpace();
  const navigate = useNavigate();
  const categoriesById: Map<string, Category> = useCategoriesById();
  const slices: SpendingSlice[] = summary ? buildSpendingSlices(summary.byCategory, categoriesById) : [];

  const open = (slice: SpendingSlice): void => {
    const params: URLSearchParams = new URLSearchParams({ month });
    if (slice.filter) {
      params.set('categoryId', slice.filter);
    }
    navigate(`${spaceUrl(space.id, '/transactions')}?${params.toString()}`);
  };

  return (
    <Card size="2">
      <Heading size="3" mb="3">
        Dépenses par catégorie
      </Heading>
      {!summary ? (
        <Skeleton height="200px" />
      ) : slices.length === 0 ? (
        <EmptyState icon="🌱" title="Aucune dépense" description={`Pas de dépense enregistrée en ${formatMonth(month)}.`} />
      ) : (
        <SpendingDonut slices={slices} onSelect={open} />
      )}
    </Card>
  );
}

function BudgetsCard({ summary, month }: { summary: MonthSummary | undefined; month: string }) {
  const { space, canEdit } = useCurrentSpace();
  const categoriesById: Map<string, Category> = useCategoriesById();
  const budgets: BudgetStatus[] = summary?.budgets ?? [];
  const alerts: BudgetStatus[] = budgets
    .filter((budget: BudgetStatus) => budget.monthlyLimitCents > 0 && budget.spentCents / budget.monthlyLimitCents >= BUDGET_ALERT_RATIO)
    .sort((a: BudgetStatus, b: BudgetStatus) => b.spentCents / b.monthlyLimitCents - a.spentCents / a.monthlyLimitCents)
    .slice(0, 5);

  return (
    <Card size="2">
      <CardTitle title="Budgets à surveiller" to={`${spaceUrl(space.id, '/budgets')}?month=${month}`} />
      {!summary ? (
        <Skeleton height="120px" />
      ) : budgets.length === 0 ? (
        <Text as="p" size="2" color="gray">
          Aucun budget pour l'instant.{' '}
          {canEdit && (
            <Link asChild>
              <RouterLink to={spaceUrl(space.id, '/budgets')}>Fixe un plafond par catégorie</RouterLink>
            </Link>
          )}
        </Text>
      ) : alerts.length === 0 ? (
        <Flex align="center" gap="2">
          <Text color="grass">
            <CheckCircledIcon />
          </Text>
          <Text size="2" color="gray">
            Tous tes budgets sont sous {Math.round(BUDGET_ALERT_RATIO * 100)} % de leur plafond.
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap="3">
          {alerts.map((budget: BudgetStatus) => {
            const ratio: number = budget.spentCents / budget.monthlyLimitCents;
            const over: boolean = budget.spentCents > budget.monthlyLimitCents;
            return (
              <Box key={budget.categoryId}>
                <Flex justify="between" align="center" gap="2" mb="1">
                  <CategoryBadge category={categoriesById.get(budget.categoryId)} size="1" />
                  <Text size="1" className="tabular" color={over ? 'red' : 'gray'} weight={over ? 'bold' : 'regular'}>
                    {formatCents(budget.spentCents)} / {formatCents(budget.monthlyLimitCents)}
                  </Text>
                </Flex>
                <Progress value={Math.min(100, ratio * 100)} color={over ? 'red' : 'amber'} size="1" aria-label={`${formatPercent(ratio)} du budget`} />
                <Text size="1" color={over ? 'red' : 'gray'}>
                  {over ? `Dépassé de ${formatCents(budget.spentCents - budget.monthlyLimitCents)}` : `Reste ${formatCents(budget.monthlyLimitCents - budget.spentCents)}`}
                </Text>
              </Box>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

function GoalsCard() {
  const { space, canEdit } = useCurrentSpace();
  const goals = useGoals();
  const list: Goal[] = (goals.data ?? []).slice(0, 4);

  return (
    <Card size="2">
      <CardTitle title="Objectifs" to={spaceUrl(space.id, '/goals')} />
      {goals.isPending ? (
        <Skeleton height="120px" />
      ) : goals.isError ? (
        <ErrorCallout error={goals.error} />
      ) : list.length === 0 ? (
        <Text as="p" size="2" color="gray">
          Aucun objectif d'épargne.{' '}
          {canEdit && (
            <Link asChild>
              <RouterLink to={spaceUrl(space.id, '/goals')}>Créer un objectif</RouterLink>
            </Link>
          )}
        </Text>
      ) : (
        <Flex direction="column" gap="3">
          {list.map((goal: Goal) => {
            const ratio: number = goal.targetCents > 0 ? goal.savedCents / goal.targetCents : 0;
            return (
              <Box key={goal.id}>
                <Flex justify="between" align="center" gap="2" mb="1">
                  <Text size="2" truncate>
                    {goal.emoji ? `${goal.emoji} ` : ''}
                    {goal.name}
                  </Text>
                  <Text size="1" color="gray" className="tabular" style={{ whiteSpace: 'nowrap' }}>
                    {formatCents(goal.savedCents)} / {formatCents(goal.targetCents)}
                  </Text>
                </Flex>
                <Progress value={Math.max(0, Math.min(100, ratio * 100))} color={goal.color} size="1" aria-label={`${formatPercent(ratio)} de l'objectif`} />
                <Text size="1" color="gray">
                  {goal.deadline ? `Échéance ${formatDay(goal.deadline)}` : 'Sans échéance'}
                </Text>
              </Box>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

function LatestTransactionsCard({ month }: { month: string }) {
  const { space } = useCurrentSpace();
  const transactions = useTransactions({ month, pageSize: 6 });
  const categoriesById: Map<string, Category> = useCategoriesById();
  const items: Transaction[] = transactions.data?.items ?? [];

  return (
    <Card size="2">
      <CardTitle title="Dernières transactions" to={`${spaceUrl(space.id, '/transactions')}?month=${month}`} />
      {transactions.isPending ? (
        <Skeleton height="120px" />
      ) : transactions.isError ? (
        <ErrorCallout error={transactions.error} />
      ) : items.length === 0 ? (
        <Text as="p" size="2" color="gray">
          Aucune transaction ce mois-ci.
        </Text>
      ) : (
        <Flex direction="column" gap="2">
          {items.map((transaction: Transaction) => (
            <Flex key={transaction.id} justify="between" align="center" gap="3">
              <Box minWidth="0">
                <Text as="div" size="2" weight="medium" truncate>
                  {transaction.label}
                </Text>
                <Flex align="center" gap="2" mt="1">
                  <Text size="1" color="gray" style={{ whiteSpace: 'nowrap' }}>
                    {formatDay(transaction.date)}
                  </Text>
                  <CategoryBadge category={transaction.categoryId ? (categoriesById.get(transaction.categoryId) ?? null) : null} size="1" />
                </Flex>
              </Box>
              <Money cents={transaction.amountCents} colored size="2" />
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}

function CardTitle({ title, to }: { title: string; to: string }) {
  return (
    <Flex justify="between" align="center" mb="3">
      <Heading size="3">{title}</Heading>
      <Link asChild size="2">
        <RouterLink to={to}>Tout voir</RouterLink>
      </Link>
    </Flex>
  );
}

/** First visit: what to do, in order. Viewers learn that an editor has to start. */
function Onboarding({ hasAccount }: { hasAccount: boolean }) {
  const { space, canEdit } = useCurrentSpace();
  if (!canEdit) {
    return (
      <Card size="3">
        <EmptyState icon="🌱" title="Cet espace est encore vide" description="Les chiffres apparaîtront ici dès qu'un éditeur aura importé un premier relevé bancaire." />
      </Card>
    );
  }
  const steps: { title: string; description: string; done: boolean }[] = [
    { title: 'Ajoute un compte', description: 'Le compte dont tu vas importer les relevés (compte courant, livret...).', done: hasAccount },
    { title: 'Importe un relevé', description: 'Exporte un fichier CSV ou OFX depuis le site de ta banque et dépose-le.', done: false },
    { title: 'Catégorise', description: 'Les règles classent les transactions récurrentes, tu valides le reste en quelques clics.', done: false },
  ];
  return (
    <Card size="4">
      <Flex direction="column" gap="5" align="center" style={{ textAlign: 'center' }}>
        <Box>
          <Text size="8">👋</Text>
          <Heading size="6" mt="2">
            Bienvenue dans {space.name}
          </Heading>
          <Text as="p" size="2" color="gray" mt="1">
            Trois étapes pour voir où va ton argent chaque mois.
          </Text>
        </Box>
        <Grid columns={{ initial: '1', sm: '3' }} gap="3" width="100%" style={{ textAlign: 'left' }}>
          {steps.map((step, index: number) => (
            <Card key={step.title} variant="surface" style={{ opacity: step.done ? 0.6 : 1 }}>
              <Flex align="center" gap="2" mb="1">
                <Badge radius="full" color={step.done ? 'grass' : undefined} variant={step.done ? 'soft' : 'solid'}>
                  {step.done ? '✓' : index + 1}
                </Badge>
                <Text weight="bold" size="2">
                  {step.title}
                </Text>
              </Flex>
              <Text size="2" color="gray">
                {step.description}
              </Text>
            </Card>
          ))}
        </Grid>
        {hasAccount ? (
          <Button size="3" asChild>
            <RouterLink to={spaceUrl(space.id, '/import')}>
              <UploadIcon /> Importer un relevé
            </RouterLink>
          </Button>
        ) : (
          <Button size="3" asChild>
            <RouterLink to={`${spaceUrl(space.id, '/settings')}?tab=accounts`}>Ajouter un compte</RouterLink>
          </Button>
        )}
      </Flex>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Flex direction="column" gap="4">
      <Grid columns={{ initial: '2', md: '4' }} gap="3">
        {[0, 1, 2, 3].map((index: number) => (
          <Skeleton key={index} height="108px" />
        ))}
      </Grid>
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Skeleton height="280px" />
        <Skeleton height="280px" />
      </Grid>
    </Flex>
  );
}

function sumTransactions(accounts: Account[]): number {
  let total: number = 0;
  for (const account of accounts) {
    total += account.transactionCount;
  }
  return total;
}
