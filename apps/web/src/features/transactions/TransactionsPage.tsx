import { Cross2Icon, DotsHorizontalIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { AlertDialog, Box, Button, Card, Checkbox, DropdownMenu, Flex, Grid, IconButton, Select, Skeleton, Text, TextField } from '@radix-ui/themes';
import { useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { CATEGORY_KINDS, type Account, type Category, type CategoryKind, type Transaction, type TransactionQuery } from '@bank/shared';
import { CategoryPicker } from '../../components/CategoryPicker';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { MonthHeader } from '../../components/MonthHeader';
import { formatMonth } from '../../lib/format';
import { spaceUrl, useCurrentSpace } from '../../lib/space';
import { useMonthParam } from '../../lib/useMonthParam';
import { useAccounts } from '../accounts/api';
import { useCategories, useCategoriesById } from '../categories/api';
import { RuleDialog } from '../categories/RuleDialog';
import { suggestRulePattern } from '../categories/rulePattern';
import { useBulkCategorize, useDeleteTransaction, useTransactions, useUpdateTransaction } from './api';
import { groupByDay, isObjectId, type DayGroup } from './grouping';
import { TransactionCategory } from './TransactionCategory';
import { TransactionEditDialog } from './TransactionEditDialog';

const PAGE_SIZE: number = 50;
const SEARCH_DEBOUNCE_MS: number = 300;
const ALL: string = 'all';

const KIND_GROUP_LABELS: Record<CategoryKind, string> = { expense: 'Dépenses', income: 'Revenus', transfer: 'Virements internes' };

/** Transactions of a month, grouped by day, with filters in the URL, inline and bulk categorization. */
export function TransactionsPage() {
  const { space, canEdit } = useCurrentSpace();
  const [month, setMonth] = useMonthParam();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawAccount: string | null = searchParams.get('accountId');
  const accountId: string | undefined = rawAccount && isObjectId(rawAccount) ? rawAccount : undefined;
  const rawCategory: string | null = searchParams.get('categoryId');
  const categoryId: string | undefined = rawCategory === 'none' || (rawCategory && isObjectId(rawCategory)) ? rawCategory : undefined;
  const q: string = searchParams.get('q') ?? '';
  const page: number = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const query: TransactionQuery = { month, accountId, categoryId, q: q || undefined, page, pageSize: PAGE_SIZE };
  const transactions = useTransactions(query);
  const uncategorized = useTransactions({ categoryId: 'none', pageSize: 1 });
  const accounts: Account[] = useAccounts().data ?? [];
  const categories: Category[] = useCategories().data ?? [];
  const categoriesById: Map<string, Category> = useCategoriesById();
  const update = useUpdateTransaction();
  const bulk = useBulkCategorize();
  const remove = useDeleteTransaction();

  // Search field: typed text is local, the URL follows 300 ms later.
  const [searchText, setSearchText] = useState<string>(q);
  const [syncedQ, setSyncedQ] = useState<string>(q);
  const searchTimer = useRef<number | undefined>(undefined);
  if (q !== syncedQ) {
    // URL changed from outside (filters reset, back button): reflect it in the field.
    setSyncedQ(q);
    setSearchText(q);
  }

  // Selection is per result page: reset it when the query changes.
  const queryKey: string = JSON.stringify(query);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionKey, setSelectionKey] = useState<string>(queryKey);
  if (selectionKey !== queryKey) {
    setSelectionKey(queryKey);
    setSelection(new Set());
  }

  const [ruleFor, setRuleFor] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** Updates some filters and goes back to page 1. */
  const setFilters = (changes: Record<string, string | null>): void => {
    setSearchParams(
      (previous: URLSearchParams) => {
        const params: URLSearchParams = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        }
        if (!('page' in changes)) {
          params.delete('page');
        }
        return params;
      },
      { replace: 'q' in changes },
    );
  };

  const onSearchChange = (value: string): void => {
    setSearchText(value);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setSyncedQ(value.trim());
      setFilters({ q: value.trim() || null });
    }, SEARCH_DEBOUNCE_MS);
  };

  const hasFilters: boolean = Boolean(accountId || categoryId || q);
  const items: Transaction[] = transactions.data?.items ?? [];
  const total: number = transactions.data?.total ?? 0;
  const groups: DayGroup[] = groupByDay(items);
  const accountNames: Map<string, string> = new Map(accounts.map((account: Account) => [account.id, account.name]));
  const showAccount: boolean = accounts.length > 1;
  const uncategorizedCount: number = uncategorized.data?.total ?? 0;

  const allSelected: boolean = items.length > 0 && selection.size === items.length;
  const selectedTotal: number = sumSelected(items, selection);

  const toggle = (id: string): void => {
    const next: Set<string> = new Set(selection);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelection(next);
  };

  const categorizeSelection = (targetId: string | null): void => {
    const count: number = selection.size;
    bulk.mutate(
      { ids: [...selection], categoryId: targetId },
      {
        onSuccess: () => {
          setSelection(new Set());
          setMessage(`${count} transaction${count > 1 ? 's' : ''} catégorisée${count > 1 ? 's' : ''}.`);
        },
      },
    );
  };

  return (
    <>
      <MonthHeader
        title="Transactions"
        month={month}
        onChange={setMonth}
        actions={
          canEdit &&
          uncategorizedCount > 0 && (
            <Button variant="soft" color="amber" asChild>
              <RouterLink to={spaceUrl(space.id, '/review')}>À catégoriser ({uncategorizedCount})</RouterLink>
            </Button>
          )
        }
      />

      <Flex gap="2" wrap="wrap" mb="3">
        <Box flexGrow="1" minWidth="220px">
          <TextField.Root placeholder="Rechercher un libellé ou une note" aria-label="Rechercher" value={searchText} onChange={(event) => onSearchChange(event.target.value)}>
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
            {searchText && (
              <TextField.Slot>
                <IconButton variant="ghost" color="gray" size="1" aria-label="Effacer la recherche" onClick={() => onSearchChange('')}>
                  <Cross2Icon />
                </IconButton>
              </TextField.Slot>
            )}
          </TextField.Root>
        </Box>
        {showAccount && (
          <Select.Root value={accountId ?? ALL} onValueChange={(value: string) => setFilters({ accountId: value === ALL ? null : value })}>
            <Select.Trigger aria-label="Compte" />
            <Select.Content>
              <Select.Item value={ALL}>Tous les comptes</Select.Item>
              {accounts.map((account: Account) => (
                <Select.Item key={account.id} value={account.id}>
                  {account.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        <Select.Root value={categoryId ?? ALL} onValueChange={(value: string) => setFilters({ categoryId: value === ALL ? null : value })}>
          <Select.Trigger aria-label="Catégorie" />
          <Select.Content>
            <Select.Item value={ALL}>Toutes les catégories</Select.Item>
            <Select.Item value="none">Non catégorisé</Select.Item>
            {CATEGORY_KINDS.map((kind: CategoryKind) => (
              <Select.Group key={kind}>
                <Select.Separator />
                <Select.Label>{KIND_GROUP_LABELS[kind]}</Select.Label>
                {categories
                  .filter((category: Category) => category.kind === kind)
                  .map((category: Category) => (
                    <Select.Item key={category.id} value={category.id}>
                      {category.emoji ? `${category.emoji} ` : ''}
                      {category.name}
                    </Select.Item>
                  ))}
              </Select.Group>
            ))}
          </Select.Content>
        </Select.Root>
        {hasFilters && (
          <Button variant="ghost" color="gray" onClick={() => setFilters({ accountId: null, categoryId: null, q: null })}>
            <Cross2Icon /> Effacer les filtres
          </Button>
        )}
      </Flex>

      {message && (
        <Flex mb="3" align="center" gap="2" role="status">
          <Text size="2" color="green">
            ✓ {message}
          </Text>
          <IconButton variant="ghost" color="gray" size="1" aria-label="Masquer le message" onClick={() => setMessage(null)}>
            <Cross2Icon />
          </IconButton>
        </Flex>
      )}
      <Flex direction="column" gap="2" mb={transactions.error || update.error || bulk.error || remove.error ? '3' : '0'}>
        <ErrorCallout error={transactions.error ?? update.error ?? bulk.error ?? remove.error} />
      </Flex>

      <Card size="1" style={{ padding: 0 }}>
        {/* Toolbar: count, or bulk actions once rows are selected. */}
        <Flex align="center" gap="3" px="3" py="2" wrap="wrap" style={{ borderBottom: '1px solid var(--gray-a4)', background: selection.size > 0 ? 'var(--accent-a2)' : undefined, minHeight: 48 }}>
          {canEdit && items.length > 0 && (
            <Checkbox
              aria-label={allSelected ? 'Tout désélectionner' : 'Tout sélectionner sur cette page'}
              checked={allSelected ? true : selection.size > 0 ? 'indeterminate' : false}
              onCheckedChange={() => setSelection(allSelected ? new Set() : new Set(items.map((item: Transaction) => item.id)))}
            />
          )}
          {selection.size > 0 ? (
            <>
              <Text size="2" weight="medium">
                {selection.size} sélectionnée{selection.size > 1 ? 's' : ''}
              </Text>
              <Money cents={selectedTotal} colored size="2" />
              <Box flexGrow="1" />
              <CategoryPicker
                categories={categories}
                allowNone
                align="end"
                onSelect={categorizeSelection}
                trigger={
                  <Button size="2" loading={bulk.isPending}>
                    Catégoriser
                  </Button>
                }
              />
              <IconButton variant="ghost" color="gray" aria-label="Annuler la sélection" onClick={() => setSelection(new Set())}>
                <Cross2Icon />
              </IconButton>
            </>
          ) : (
            <Text size="2" color="gray">
              {transactions.isPending ? 'Chargement…' : `${total} transaction${total > 1 ? 's' : ''}${hasFilters ? ' trouvée' + (total > 1 ? 's' : '') : ''} en ${formatMonth(month)}`}
            </Text>
          )}
        </Flex>

        {transactions.isPending ? (
          <Flex direction="column" gap="2" p="3">
            {[0, 1, 2, 3, 4, 5].map((index: number) => (
              <Skeleton key={index} height="44px" />
            ))}
          </Flex>
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="🔍"
              title="Aucune transaction ne correspond"
              description="Change de mois ou élargis les filtres."
              action={
                <Button variant="soft" onClick={() => setFilters({ accountId: null, categoryId: null, q: null })}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="🧾"
              title={`Aucune transaction en ${formatMonth(month)}`}
              description={canEdit ? 'Importe un relevé de ta banque pour voir tes transactions ici.' : 'Les transactions apparaîtront ici après le prochain import.'}
              action={
                canEdit ? (
                  <Button asChild>
                    <RouterLink to={spaceUrl(space.id, '/import')}>Importer un relevé</RouterLink>
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <Box style={{ opacity: transactions.isPlaceholderData ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {groups.map((group: DayGroup) => (
              <Box key={group.date}>
                <Flex justify="between" px="3" py="1" style={{ background: 'var(--gray-a2)', borderBottom: '1px solid var(--gray-a3)' }}>
                  <Text size="1" weight="medium" color="gray">
                    {group.title}
                  </Text>
                </Flex>
                {group.items.map((transaction: Transaction) => (
                  <Grid
                    key={transaction.id}
                    columns={canEdit ? { initial: '20px minmax(0, 1fr) auto 24px', sm: '20px minmax(0, 1fr) 220px 120px 24px' } : { initial: 'minmax(0, 1fr) auto', sm: 'minmax(0, 1fr) 220px 120px' }}
                    gap="3"
                    align="center"
                    px="3"
                    py="2"
                    style={{ borderBottom: '1px solid var(--gray-a3)', background: selection.has(transaction.id) ? 'var(--accent-a3)' : undefined }}
                  >
                    {canEdit && <Checkbox aria-label={`Sélectionner ${transaction.label}`} checked={selection.has(transaction.id)} onCheckedChange={() => toggle(transaction.id)} />}
                    <Box minWidth="0">
                      <Text as="div" size="2" weight="medium" truncate>
                        {transaction.label}
                      </Text>
                      <Text as="div" size="1" color="gray" truncate>
                        {joinMeta([
                          showAccount ? (accountNames.get(transaction.accountId) ?? '') : '',
                          transaction.rawLabel !== transaction.label ? transaction.rawLabel : '',
                          transaction.note ?? '',
                        ])}
                      </Text>
                      <Box display={{ initial: 'block', sm: 'none' }} mt="1">
                        <TransactionCategory
                          transaction={transaction}
                          categories={categories}
                          categoriesById={categoriesById}
                          canEdit={canEdit}
                          onChange={(id: string | null) => update.mutate({ id: transaction.id, body: { categoryId: id } })}
                          onCreateRule={() => setRuleFor(transaction)}
                        />
                      </Box>
                    </Box>
                    <Box display={{ initial: 'none', sm: 'block' }} minWidth="0">
                      <TransactionCategory
                        transaction={transaction}
                        categories={categories}
                        categoriesById={categoriesById}
                        canEdit={canEdit}
                        onChange={(id: string | null) => update.mutate({ id: transaction.id, body: { categoryId: id } })}
                        onCreateRule={() => setRuleFor(transaction)}
                      />
                    </Box>
                    <Flex justify="end">
                      <Money cents={transaction.amountCents} colored size="2" weight="medium" />
                    </Flex>
                    {canEdit && (
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <IconButton variant="ghost" color="gray" size="1" aria-label={`Actions pour ${transaction.label}`}>
                            <DotsHorizontalIcon />
                          </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Item onSelect={() => setRuleFor(transaction)}>Créer une règle</DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => setEditing(transaction)}>Modifier le libellé ou la note</DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item color="red" onSelect={() => setDeleting(transaction)}>
                            Supprimer
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    )}
                  </Grid>
                ))}
              </Box>
            ))}
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={(next: number) => setFilters({ page: next > 1 ? String(next) : null })} />
          </Box>
        )}
      </Card>

      <RuleDialog
        open={ruleFor !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRuleFor(null);
          }
        }}
        initialPattern={ruleFor ? suggestRulePattern(ruleFor.rawLabel) : ''}
        initialCategoryId={ruleFor?.categoryId ?? null}
        preferKind={ruleFor && ruleFor.amountCents > 0 ? 'income' : 'expense'}
        onSaved={setMessage}
      />
      <TransactionEditDialog transaction={editing} onClose={() => setEditing(null)} />
      <AlertDialog.Root
        open={deleting !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleting(null);
          }
        }}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Supprimer « {deleting?.label} » ?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            La transaction disparaît des statistiques et des budgets. Elle reviendrait seulement en réimportant un relevé qui la contient.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Annuler
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={() => deleting && remove.mutate(deleting.id)}>
                Supprimer
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pageCount: number = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) {
    return null;
  }
  const first: number = (page - 1) * pageSize + 1;
  const last: number = Math.min(page * pageSize, total);
  return (
    <Flex justify="between" align="center" px="3" py="2" gap="3">
      <Text size="2" color="gray">
        {first} à {last} sur {total}
      </Text>
      <Flex gap="2">
        <Button variant="soft" color="gray" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Précédent
        </Button>
        <Button variant="soft" color="gray" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          Suivant
        </Button>
      </Flex>
    </Flex>
  );
}

function sumSelected(items: Transaction[], selection: Set<string>): number {
  let total: number = 0;
  for (const item of items) {
    if (selection.has(item.id)) {
      total += item.amountCents;
    }
  }
  return total;
}

/** "Compte joint · CB CARREFOUR · note", skipping empty parts. */
function joinMeta(parts: string[]): string {
  const kept: string[] = [];
  for (const part of parts) {
    if (part) {
      kept.push(part);
    }
  }
  return kept.join(' · ');
}
