import { CheckCircledIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, ResetIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Callout, Card, Checkbox, Code, Flex, Grid, Heading, IconButton, Progress, Skeleton, Text, TextField } from '@radix-ui/themes';
import { useState, type ReactElement } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import type { Account, Category, CategoryKind, ImportRecord, Transaction } from '@bank/shared';
import { CategoryPicker } from '../../components/CategoryPicker';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { PageHeader } from '../../components/PageHeader';
import { formatDay } from '../../lib/format';
import { spaceUrl, useCurrentSpace } from '../../lib/space';
import { useAccounts } from '../accounts/api';
import { useApplyRules, useCategories, useCreateRule } from '../categories/api';
import { labelMatchesPattern, suggestRulePattern } from '../categories/rulePattern';
import { useImports, useUndoImport } from '../import/api';
import { useTransactions, useUpdateTransaction } from './api';
import { formatDayTitle, isObjectId } from './grouping';

/** The queue holds at most one API page: an import rarely brings more than 200 uncategorized rows. */
const QUEUE_SIZE: number = 200;

/**
 * "À revoir" queue (design direction 3): uncategorized transactions of an import (or all of them),
 * one active transaction, one click per category, optional rule prefilled from the bank label.
 */
export function ReviewPage() {
  const { space, canEdit } = useCurrentSpace();
  const [searchParams] = useSearchParams();
  const rawImportId: string | null = searchParams.get('importId');
  const importId: string | undefined = rawImportId && isObjectId(rawImportId) ? rawImportId : undefined;

  const queue = useTransactions({ importId, categoryId: 'none', pageSize: QUEUE_SIZE });
  const importRecord: ImportRecord | undefined = useImports().data?.find((record: ImportRecord) => record.id === importId);
  const accounts: Account[] = useAccounts().data ?? [];
  const categories: Category[] = useCategories().data ?? [];

  // Rows categorized during this visit, hidden right away (before the list refetches).
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [initialTotal, setInitialTotal] = useState<number | null>(null);
  const [actionError, setActionError] = useState<Error | null>(null);
  const update = useUpdateTransaction();
  const createRule = useCreateRule();
  const applyRules = useApplyRules();

  const items: Transaction[] = (queue.data?.items ?? []).filter((item: Transaction) => !doneIds.has(item.id));
  const remaining: number = Math.max(0, (queue.data?.total ?? 0) - countIn(queue.data?.items ?? [], doneIds));
  if (queue.data && (initialTotal === null || queue.data.total > initialTotal)) {
    setInitialTotal(queue.data.total);
  }
  const reviewed: number = Math.max(0, (initialTotal ?? 0) - remaining);

  const active: Transaction | undefined =
    items.find((item: Transaction) => item.id === activeId) ?? items.find((item: Transaction) => !skippedIds.has(item.id)) ?? items[0];
  const activeIndex: number = active ? items.indexOf(active) : -1;
  const accountName: string | undefined = accounts.find((account: Account) => account.id === active?.accountId)?.name;

  const backPath: string = spaceUrl(space.id, importId ? '/import' : '/transactions');

  const header: ReactElement = (
    <PageHeader
      title="À revoir"
      description={importId ? 'Transactions de cet import sans catégorie.' : 'Toutes les transactions sans catégorie, tous mois confondus.'}
      actions={
        <Button variant="soft" color="gray" asChild>
          <RouterLink to={spaceUrl(space.id, '/transactions')}>Voir les transactions</RouterLink>
        </Button>
      }
    />
  );

  if (!canEdit) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon="👀"
            title="La revue est réservée aux éditeurs"
            description={`${queue.data?.total ?? 0} transaction${(queue.data?.total ?? 0) > 1 ? 's attendent' : ' attend'} une catégorie. Un éditeur de l'espace peut les classer.`}
            action={
              <Button variant="soft" asChild>
                <RouterLink to={`${spaceUrl(space.id, '/transactions')}?categoryId=none`}>Voir les transactions</RouterLink>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const goTo = (index: number): void => {
    const target: Transaction | undefined = items[index];
    if (target) {
      setActiveId(target.id);
      setMessage(null);
    }
  };

  const skip = (): void => {
    if (!active) {
      return;
    }
    setSkippedIds(new Set(skippedIds).add(active.id));
    setActiveId(nextId(items, activeIndex, skippedIds, active.id));
    setMessage(null);
  };

  /** Hides the row and moves to the next one (optimistic), or brings it back if the API refuses. */
  const markDone = (transaction: Transaction): void => {
    setDoneIds(new Set(doneIds).add(transaction.id));
    setActiveId(nextId(items, items.indexOf(transaction), skippedIds, transaction.id));
  };
  const unmarkDone = (transaction: Transaction): void => {
    setDoneIds((previous: Set<string>) => {
      const next: Set<string> = new Set(previous);
      next.delete(transaction.id);
      return next;
    });
  };

  /** Categorizes (optimistic), then optionally creates the rule and applies it to the rest of the queue. */
  const categorize = async (transaction: Transaction, category: Category, rulePattern: string | null): Promise<void> => {
    setMessage(null);
    setActionError(null);
    markDone(transaction);
    try {
      await update.mutateAsync({ id: transaction.id, body: { categoryId: category.id } });
    } catch (error) {
      unmarkDone(transaction);
      setActionError(error as Error);
      return;
    }
    if (!rulePattern) {
      return;
    }
    try {
      await createRule.mutateAsync({ pattern: rulePattern, categoryId: category.id });
      const { updated } = await applyRules.mutateAsync({ onlyUncategorized: true });
      setMessage(
        updated > 0
          ? `Règle « ${rulePattern} » créée : ${updated} autre${updated > 1 ? 's' : ''} transaction${updated > 1 ? 's classées' : ' classée'} en ${category.name}.`
          : `Règle « ${rulePattern} » créée, elle s'appliquera aux prochains imports.`,
      );
    } catch (error) {
      setActionError(new Error(`Transaction classée, mais la règle n'a pas été créée : ${(error as Error).message}`));
    }
  };

  return (
    <>
      {header}
      {importId && <ImportBanner record={importRecord} remaining={remaining} accounts={accounts} backPath={backPath} />}

      <Flex direction="column" gap="3" mb={queue.error || actionError ? '4' : '0'}>
        <ErrorCallout error={queue.error} />
        <ErrorCallout error={actionError} />
      </Flex>

      {queue.isPending ? (
        <Grid columns={{ initial: '1', md: 'minmax(0, 5fr) minmax(0, 7fr)' }} gap="4">
          <Skeleton height="320px" />
          <Skeleton height="320px" />
        </Grid>
      ) : !active ? (
        <Card>
          <EmptyState
            icon="🎉"
            title={reviewed > 0 ? 'Tout est catégorisé' : 'Rien à revoir'}
            description={
              reviewed > 0
                ? `${reviewed} transaction${reviewed > 1 ? 's classées' : ' classée'} pendant cette revue. Tes statistiques sont à jour.`
                : importId
                  ? 'Toutes les transactions de cet import ont déjà une catégorie.'
                  : 'Toutes tes transactions ont une catégorie.'
            }
            action={
              <Flex gap="2" wrap="wrap" justify="center">
                <Button asChild>
                  <RouterLink to={spaceUrl(space.id)}>Voir le tableau de bord</RouterLink>
                </Button>
                <Button variant="soft" asChild>
                  <RouterLink to={spaceUrl(space.id, '/transactions')}>Voir les transactions</RouterLink>
                </Button>
              </Flex>
            }
          />
        </Card>
      ) : (
        <Grid columns={{ initial: '1', md: 'minmax(0, 5fr) minmax(0, 7fr)' }} gap="4" align="start">
          {/* Detail first in the DOM: on mobile it comes before the list. */}
          <Box gridColumn={{ md: '2' }} gridRow={{ md: '1' }}>
            {message && (
              <Callout.Root color="green" size="1" mb="3" role="status">
                <Callout.Icon>
                  <CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>{message}</Callout.Text>
              </Callout.Root>
            )}
            <ReviewDetail
              key={active.id}
              transaction={active}
              position={activeIndex + 1}
              count={items.length}
              accountName={accountName}
              categories={categories}
              queue={items}
              onPrevious={() => goTo(activeIndex - 1)}
              onNext={() => goTo(activeIndex + 1)}
              onSkip={skip}
              onCategorize={categorize}
            />
          </Box>
          <Box gridColumn={{ md: '1' }} gridRow={{ md: '1' }}>
            <Card size="1" style={{ padding: 0 }}>
              <Flex align="center" gap="3" px="3" py="2" style={{ borderBottom: '1px solid var(--gray-a4)' }}>
                <Text size="1" color="gray" style={{ whiteSpace: 'nowrap' }}>
                  {reviewed} sur {initialTotal ?? 0} revue{reviewed > 1 ? 's' : ''}
                </Text>
                <Box flexGrow="1">
                  <Progress value={initialTotal ? (reviewed / initialTotal) * 100 : 0} size="1" aria-label="Progression de la revue" />
                </Box>
              </Flex>
              <Box style={{ maxHeight: 560, overflowY: 'auto' }}>
                {items.map((item: Transaction, index: number) => (
                  <QueueRow key={item.id} transaction={item} active={item.id === active.id} skipped={skippedIds.has(item.id)} onSelect={() => goTo(index)} />
                ))}
              </Box>
            </Card>
          </Box>
        </Grid>
      )}
    </>
  );
}

function QueueRow({ transaction, active, skipped, onSelect }: { transaction: Transaction; active: boolean; skipped: boolean; onSelect: () => void }) {
  return (
    <Flex
      asChild
      align="center"
      gap="3"
      px="3"
      py="2"
      style={{
        width: '100%',
        border: 'none',
        borderBottom: '1px solid var(--gray-a3)',
        borderLeft: `3px solid ${active ? 'var(--accent-9)' : 'transparent'}`,
        background: active ? 'var(--accent-a3)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <button type="button" onClick={onSelect} aria-current={active ? 'true' : undefined}>
        <Box flexGrow="1" minWidth="0">
          <Text as="div" size="2" weight="medium" truncate>
            {transaction.label}
          </Text>
          <Text as="div" size="1" color="gray" truncate>
            {formatDay(transaction.date)}
            {skipped ? ' · passée' : ''}
          </Text>
        </Box>
        <Money cents={transaction.amountCents} colored size="2" />
      </button>
    </Flex>
  );
}

interface ReviewDetailProps {
  transaction: Transaction;
  position: number;
  count: number;
  accountName: string | undefined;
  categories: Category[];
  /** Rows still in the queue, to preview what a rule would catch. */
  queue: Transaction[];
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
  /** Owned by the page: this panel unmounts as soon as the row is done, mutate callbacks would be lost. */
  onCategorize: (transaction: Transaction, category: Category, rulePattern: string | null) => void;
}

/** Active transaction: big label and amount, one button per category, rule box. Remounted per transaction (key). */
function ReviewDetail({ transaction, position, count, accountName, categories, queue, onPrevious, onNext, onSkip, onCategorize }: ReviewDetailProps) {
  const [pattern, setPattern] = useState<string>(() => suggestRulePattern(transaction.rawLabel));
  const otherMatches: number = countMatches(queue, transaction.id, pattern);
  // Checked by default only when the rule would already help in this queue: avoids piling up one-off rules.
  const [ruleEnabled, setRuleEnabled] = useState<boolean>(otherMatches > 0);

  const preferKind: CategoryKind = transaction.amountCents > 0 ? 'income' : 'expense';
  const quick: Category[] = categories.filter((category: Category) => category.kind === preferKind || category.kind === 'transfer');
  const ruleValid: boolean = pattern.trim().length >= 2;

  const categorize = (category: Category): void => {
    onCategorize(transaction, category, ruleEnabled && ruleValid ? pattern.trim() : null);
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            Transaction {position} sur {count}
            {accountName ? ` · ${accountName}` : ''}
          </Text>
          <Flex gap="1">
            <IconButton variant="soft" color="gray" size="1" aria-label="Transaction précédente" disabled={position <= 1} onClick={onPrevious}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton variant="soft" color="gray" size="1" aria-label="Transaction suivante" disabled={position >= count} onClick={onNext}>
              <ChevronRightIcon />
            </IconButton>
          </Flex>
        </Flex>

        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Box minWidth="0" style={{ flex: '1 1 220px' }}>
            <Heading size="6">{transaction.label}</Heading>
            <Code variant="ghost" color="gray" size="1">
              {transaction.rawLabel}
            </Code>
          </Box>
          <Box style={{ textAlign: 'right', marginLeft: 'auto' }} flexShrink="0">
            <Money cents={transaction.amountCents} colored size="7" weight="bold" />
            <Text as="div" size="1" color="gray">
              {formatDayTitle(transaction.date)}
            </Text>
          </Box>
        </Flex>

        <Box>
          <Text as="div" size="2" weight="bold" mb="2">
            Catégorie
          </Text>
          <Grid columns={{ initial: '2', sm: '3' }} gap="2">
            {quick.map((category: Category) => (
              <Button key={category.id} variant="soft" color={category.color} onClick={() => categorize(category)} style={{ justifyContent: 'flex-start' }}>
                {category.emoji && <span aria-hidden="true">{category.emoji}</span>}
                <Text truncate>{category.name}</Text>
              </Button>
            ))}
          </Grid>
          <Flex mt="2">
            <CategoryPicker
              categories={categories}
              preferKind={preferKind}
              onSelect={(id: string | null) => {
                const category: Category | undefined = categories.find((item: Category) => item.id === id);
                if (category) {
                  categorize(category);
                }
              }}
              trigger={
                <Button variant="ghost" size="1">
                  Autre catégorie…
                </Button>
              }
            />
          </Flex>
        </Box>

        <Box p="3" style={{ border: '1px solid var(--gray-a5)', borderRadius: 'var(--radius-3)', background: 'var(--gray-a2)' }}>
          <Text as="label" size="2" weight="medium">
            <Flex gap="2" align="center">
              <Checkbox checked={ruleEnabled} onCheckedChange={(checked) => setRuleEnabled(checked === true)} />
              Créer une règle avec la catégorie choisie
            </Flex>
          </Text>
          <Flex align="center" gap="2" mt="2" ml="5" wrap="wrap">
            <Text size="2" color="gray" id="review-rule-label">
              Si le libellé contient
            </Text>
            <TextField.Root size="1" aria-labelledby="review-rule-label" value={pattern} disabled={!ruleEnabled} onChange={(event) => setPattern(event.target.value)} style={{ minWidth: 160 }} />
          </Flex>
          <Text as="div" size="1" color="gray" mt="2" ml="5">
            {!ruleValid
              ? '2 caractères minimum.'
              : otherMatches > 0
                ? `Classera aussi ${otherMatches} autre${otherMatches > 1 ? 's' : ''} transaction${otherMatches > 1 ? 's' : ''} de la file, et les prochains imports.`
                : "Aucune autre transaction de la file ne correspond. La règle servira aux prochains imports."}
          </Text>
        </Box>

        <Flex gap="2" align="center" wrap="wrap">
          <Button variant="soft" color="gray" onClick={onSkip}>
            Passer
          </Button>
          <Text size="1" color="gray">
            Clique sur une catégorie pour valider et passer à la suivante.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

/** Import summary banner with the undo action. */
function ImportBanner({ record, remaining, accounts, backPath }: { record: ImportRecord | undefined; remaining: number; accounts: Account[]; backPath: string }) {
  const undo = useUndoImport();
  const navigate = useNavigate();
  if (!record) {
    return null;
  }
  const accountName: string = accounts.find((account: Account) => account.id === record.accountId)?.name ?? 'compte';
  return (
    <Card size="2" mb="4">
      <Flex gap="3" align={{ initial: 'start', sm: 'center' }} direction={{ initial: 'column', sm: 'row' }}>
        <Flex gap="3" align="center" flexGrow="1" minWidth="0">
          <Flex align="center" justify="center" flexShrink="0" width="36px" height="36px" style={{ borderRadius: 'var(--radius-3)', background: 'var(--accent-a3)', color: 'var(--accent-11)' }}>
            <FileTextIcon />
          </Flex>
          <Box minWidth="0">
            <Text as="div" size="2" weight="medium" truncate>
              Import du {formatDay(record.createdAt.slice(0, 10))} · {record.fileName} · {accountName}
            </Text>
            <Flex gap="2" mt="1" wrap="wrap">
              <Badge color="green">{plural(record.insertedCount, 'nouvelle', 'nouvelles')}</Badge>
              {record.duplicateCount > 0 && <Badge color="gray">{plural(record.duplicateCount, 'doublon ignoré', 'doublons ignorés')}</Badge>}
              {record.skippedCount > 0 && <Badge color="orange">{plural(record.skippedCount, 'ligne illisible', 'lignes illisibles')}</Badge>}
              <Badge>{plural(record.categorizedCount, 'classée par règle', 'classées par règle')}</Badge>
              <Badge color="amber">{remaining} à revoir</Badge>
            </Flex>
          </Box>
        </Flex>
        <ConfirmDialog
          title="Annuler cet import ?"
          description={`Les ${record.insertedCount} transactions ajoutées par « ${record.fileName} » seront supprimées, y compris celles déjà catégorisées. Tu pourras réimporter le fichier.`}
          confirmLabel="Annuler l'import"
          cancelLabel="Garder l'import"
          onConfirm={() => undo.mutate(record.id, { onSuccess: () => navigate(backPath) })}
          trigger={
            <Button variant="soft" color="red" loading={undo.isPending} style={{ flexShrink: 0 }}>
              <ResetIcon /> Annuler l'import
            </Button>
          }
        />
      </Flex>
      {undo.error && (
        <Box mt="3">
          <ErrorCallout error={undo.error} />
        </Box>
      )}
    </Card>
  );
}

/** Next row to show after `index`, preferring rows not skipped, wrapping around. Null when nothing else is left. */
function nextId(items: Transaction[], index: number, skipped: Set<string>, currentId: string): string | null {
  for (let offset: number = 1; offset < items.length; offset += 1) {
    const candidate: Transaction | undefined = items[(index + offset) % items.length];
    if (candidate && candidate.id !== currentId && !skipped.has(candidate.id)) {
      return candidate.id;
    }
  }
  const fallback: Transaction | undefined = items.find((item: Transaction) => item.id !== currentId);
  return fallback?.id ?? null;
}

function countMatches(queue: Transaction[], excludeId: string, pattern: string): number {
  let count: number = 0;
  for (const item of queue) {
    if (item.id !== excludeId && labelMatchesPattern(item.rawLabel, pattern)) {
      count += 1;
    }
  }
  return count;
}

function countIn(items: Transaction[], ids: Set<string>): number {
  let count: number = 0;
  for (const item of items) {
    if (ids.has(item.id)) {
      count += 1;
    }
  }
  return count;
}

/** "1 nouvelle" / "3 nouvelles" (0 takes the plural in these badges, like "0 doublons"). */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
