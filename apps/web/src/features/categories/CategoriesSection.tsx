import { CheckCircledIcon, LightningBoltIcon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Callout, Card, Code, Flex, Grid, IconButton, Skeleton, Table, Text } from '@radix-ui/themes';
import { useState } from 'react';
import { CATEGORY_KINDS, type Category, type CategoryKind, type Rule } from '@bank/shared';
import { CategoryBadge } from '../../components/CategoryBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { useCurrentSpace } from '../../lib/space';
import { useApplyRules, useCategories, useCategoriesById, useDeleteCategory, useDeleteRule, useRules } from './api';
import { CategoryDialog } from './CategoryDialog';
import { RuleDialog } from './RuleDialog';

const KIND_SECTION_TITLES: Record<CategoryKind, string> = {
  expense: 'Dépenses',
  income: 'Revenus',
  transfer: 'Virements internes',
};

const KIND_SECTION_HINTS: Record<CategoryKind, string> = {
  expense: 'Comptent dans les dépenses et les budgets.',
  income: 'Comptent dans les revenus.',
  transfer: 'Exclus des revenus et des dépenses (argent qui reste chez toi).',
};

/** Settings > Catégories et règles. */
export function CategoriesSection() {
  return (
    <Flex direction="column" gap="4">
      <CategoriesCard />
      <RulesCard />
    </Flex>
  );
}

function CategoriesCard() {
  const { canEdit } = useCurrentSpace();
  const categories = useCategories();
  const rules: Rule[] = useRules().data ?? [];
  const deleteCategory = useDeleteCategory();

  return (
    <Card size="2">
      <Flex justify="between" align="center" mb="3" gap="3">
        <Box>
          <Text as="div" weight="bold">
            Catégories
          </Text>
          <Text as="div" size="2" color="gray">
            Elles classent tes transactions et alimentent les statistiques et les budgets.
          </Text>
        </Box>
        {canEdit && (
          <CategoryDialog
            trigger={
              <Button size="2">
                <PlusIcon /> Ajouter
              </Button>
            }
          />
        )}
      </Flex>

      <ErrorCallout error={categories.error ?? deleteCategory.error} />

      {categories.isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="32px" />
          <Skeleton height="32px" />
          <Skeleton height="32px" />
        </Flex>
      ) : categories.data?.length === 0 ? (
        <EmptyState
          icon="🏷️"
          title="Aucune catégorie"
          description="Crée des catégories pour classer tes dépenses et tes revenus."
          action={canEdit ? <CategoryDialog trigger={<Button>Ajouter une catégorie</Button>} /> : undefined}
        />
      ) : (
        <Flex direction="column" gap="4">
          {CATEGORY_KINDS.map((kind: CategoryKind) => {
            const items: Category[] = (categories.data ?? []).filter((category: Category) => category.kind === kind);
            if (items.length === 0) {
              return null;
            }
            return (
              <Box key={kind}>
                <Flex align="baseline" gap="2" mb="2" wrap="wrap">
                  <Text size="2" weight="medium">
                    {KIND_SECTION_TITLES[kind]}
                  </Text>
                  <Text size="1" color="gray">
                    {KIND_SECTION_HINTS[kind]}
                  </Text>
                </Flex>
                <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="2">
                  {items.map((category: Category) => {
                    const ruleCount: number = countRules(rules, category.id);
                    return (
                      <Flex key={category.id} align="center" justify="between" gap="2" py="1" px="2" style={{ border: '1px solid var(--gray-a4)', borderRadius: 'var(--radius-3)', minHeight: 40 }}>
                        <CategoryBadge category={category} />
                        {canEdit && (
                          <Flex gap="1">
                            <CategoryDialog
                              category={category}
                              trigger={
                                <IconButton variant="ghost" color="gray" size="1" aria-label={`Modifier ${category.name}`}>
                                  <Pencil1Icon />
                                </IconButton>
                              }
                            />
                            <ConfirmDialog
                              title={`Supprimer « ${category.name} » ?`}
                              description={
                                <>
                                  Ses transactions redeviennent <strong>non catégorisées</strong>
                                  {ruleCount > 0 ? `, ses ${ruleCount} règle${ruleCount > 1 ? 's' : ''}` : ''} et son budget éventuel sont supprimés. Les
                                  statistiques des mois passés changent aussi.
                                </>
                              }
                              confirmLabel="Supprimer"
                              onConfirm={() => deleteCategory.mutate(category.id)}
                              trigger={
                                <IconButton variant="ghost" color="red" size="1" aria-label={`Supprimer ${category.name}`}>
                                  <TrashIcon />
                                </IconButton>
                              }
                            />
                          </Flex>
                        )}
                      </Flex>
                    );
                  })}
                </Grid>
              </Box>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}

function RulesCard() {
  const { canEdit } = useCurrentSpace();
  const rules = useRules();
  const categoriesById: Map<string, Category> = useCategoriesById();
  const deleteRule = useDeleteRule();
  const applyRules = useApplyRules();
  const [message, setMessage] = useState<string | null>(null);

  const apply = (): void => {
    setMessage(null);
    applyRules.mutate(
      { onlyUncategorized: true },
      {
        onSuccess: ({ updated }) =>
          setMessage(updated === 0 ? 'Aucune transaction non catégorisée ne correspond aux règles.' : `${updated} transaction${updated > 1 ? 's' : ''} catégorisée${updated > 1 ? 's' : ''}.`),
      },
    );
  };

  return (
    <Card size="2">
      <Flex justify="between" align={{ initial: 'start', sm: 'center' }} direction={{ initial: 'column', sm: 'row' }} mb="3" gap="3">
        <Box>
          <Text as="div" weight="bold">
            Règles de catégorisation
          </Text>
          <Text as="div" size="2" color="gray">
            Appliquées à chaque import : si le libellé contient le texte, la transaction est classée. La plus petite priorité gagne.
          </Text>
        </Box>
        {canEdit && (
          <Flex gap="2" flexShrink="0">
            <Button variant="soft" onClick={apply} loading={applyRules.isPending} disabled={(rules.data?.length ?? 0) === 0}>
              <LightningBoltIcon /> Appliquer les règles
            </Button>
            <RuleDialog
              onSaved={setMessage}
              trigger={
                <Button>
                  <PlusIcon /> Ajouter
                </Button>
              }
            />
          </Flex>
        )}
      </Flex>

      {message && (
        <Callout.Root color="green" size="1" mb="3" role="status">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>{message}</Callout.Text>
        </Callout.Root>
      )}
      <ErrorCallout error={rules.error ?? deleteRule.error ?? applyRules.error} />

      {rules.isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="36px" />
          <Skeleton height="36px" />
        </Flex>
      ) : rules.data?.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="Aucune règle"
          description="Une règle classe automatiquement les transactions dont le libellé contient un texte, par exemple CARREFOUR en Courses."
          action={canEdit ? <RuleDialog onSaved={setMessage} trigger={<Button>Créer une règle</Button>} /> : undefined}
        />
      ) : (
        <>
          {/* Phones: stacked rows, the table would hide its action buttons off screen. */}
          <Flex direction="column" display={{ initial: 'flex', sm: 'none' }}>
            {rules.data?.map((rule: Rule, index: number) => (
              <Flex key={rule.id} align="center" gap="2" py="2" style={{ borderTop: index === 0 ? undefined : '1px solid var(--gray-a4)' }}>
                <Flex direction="column" align="start" gap="1" flexGrow="1" minWidth="0">
                  <Code variant="soft" color="gray" truncate>
                    {rule.pattern}
                  </Code>
                  <Flex align="center" gap="2">
                    <CategoryBadge category={categoriesById.get(rule.categoryId)} size="1" />
                    <Text size="1" color="gray">
                      priorité {rule.priority}
                    </Text>
                  </Flex>
                </Flex>
                {canEdit && <RuleActions rule={rule} onSaved={setMessage} onDelete={() => deleteRule.mutate(rule.id)} />}
              </Flex>
            ))}
          </Flex>
          <Box display={{ initial: 'none', sm: 'block' }}>
            <Table.Root size="1">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Le libellé contient</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Catégorie</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell justify="end">Priorité</Table.ColumnHeaderCell>
                  {canEdit && <Table.ColumnHeaderCell width="1%" />}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rules.data?.map((rule: Rule) => (
                  <Table.Row key={rule.id} align="center">
                    <Table.RowHeaderCell>
                      <Code variant="soft" color="gray">
                        {rule.pattern}
                      </Code>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      <CategoryBadge category={categoriesById.get(rule.categoryId)} size="1" />
                    </Table.Cell>
                    <Table.Cell justify="end">
                      <Text className="tabular" size="2" color="gray">
                        {rule.priority}
                      </Text>
                    </Table.Cell>
                    {canEdit && (
                      <Table.Cell>
                        <RuleActions rule={rule} onSaved={setMessage} onDelete={() => deleteRule.mutate(rule.id)} />
                      </Table.Cell>
                    )}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </>
      )}
    </Card>
  );
}

function RuleActions({ rule, onSaved, onDelete }: { rule: Rule; onSaved: (message: string) => void; onDelete: () => void }) {
  return (
    <Flex gap="1" flexShrink="0">
      <RuleDialog
        rule={rule}
        onSaved={onSaved}
        trigger={
          <IconButton variant="ghost" color="gray" size="1" aria-label={`Modifier la règle ${rule.pattern}`}>
            <Pencil1Icon />
          </IconButton>
        }
      />
      <ConfirmDialog
        title={`Supprimer la règle « ${rule.pattern} » ?`}
        description="Les transactions déjà classées gardent leur catégorie. Les prochains imports ne seront plus classés par cette règle."
        confirmLabel="Supprimer"
        onConfirm={onDelete}
        trigger={
          <IconButton variant="ghost" color="red" size="1" aria-label={`Supprimer la règle ${rule.pattern}`}>
            <TrashIcon />
          </IconButton>
        }
      />
    </Flex>
  );
}

function countRules(rules: Rule[], categoryId: string): number {
  let count: number = 0;
  for (const rule of rules) {
    if (rule.categoryId === categoryId) {
      count += 1;
    }
  }
  return count;
}
