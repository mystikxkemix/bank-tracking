import { Box, Flex, Text } from '@radix-ui/themes';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Category, CategoryTotal } from '@bank/shared';
import { Money } from '../../components/Money';
import { formatCents, formatPercent } from '../../lib/format';

/** One slice: a category, the uncategorized bucket, or "Autres" (small categories merged). */
export interface SpendingSlice {
  key: string;
  /** Category id, 'none' for uncategorized, null for "Autres" (no single filter). */
  filter: string | null;
  label: string;
  emoji: string | null;
  cents: number;
  color: string;
}

const MAX_SLICES: number = 6;

/**
 * Expense slices of a month: negative totals of non-transfer categories plus uncategorized,
 * biggest first, the tail merged into "Autres" so the donut stays readable.
 */
export function buildSpendingSlices(byCategory: CategoryTotal[], categoriesById: Map<string, Category>): SpendingSlice[] {
  const slices: SpendingSlice[] = [];
  for (const total of byCategory) {
    if (total.totalCents >= 0) {
      continue;
    }
    const category: Category | undefined = total.categoryId ? categoriesById.get(total.categoryId) : undefined;
    if (category?.kind === 'transfer') {
      continue;
    }
    slices.push({
      key: total.categoryId ?? 'none',
      filter: total.categoryId ?? 'none',
      label: category?.name ?? (total.categoryId ? 'Catégorie supprimée' : 'Non catégorisé'),
      emoji: category?.emoji ?? null,
      cents: 0 - total.totalCents,
      color: category ? `var(--${category.color}-9)` : 'var(--gray-8)',
    });
  }
  slices.sort((a: SpendingSlice, b: SpendingSlice) => b.cents - a.cents);
  if (slices.length <= MAX_SLICES) {
    return slices;
  }
  const head: SpendingSlice[] = slices.slice(0, MAX_SLICES - 1);
  let rest: number = 0;
  for (const slice of slices.slice(MAX_SLICES - 1)) {
    rest += slice.cents;
  }
  head.push({ key: 'others', filter: null, label: 'Autres', emoji: null, cents: rest, color: 'var(--gray-6)' });
  return head;
}

/** Donut + legend. Clicking a slice or a legend row opens the transactions filtered on it. */
export function SpendingDonut({ slices, onSelect }: { slices: SpendingSlice[]; onSelect: (slice: SpendingSlice) => void }) {
  let total: number = 0;
  for (const slice of slices) {
    total += slice.cents;
  }
  return (
    <Flex gap="4" align="center" direction={{ initial: 'column', sm: 'row' }}>
      <Box position="relative" width="150px" height="150px" flexShrink="0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="label"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
              onClick={(_data: unknown, index: number) => {
                const slice: SpendingSlice | undefined = slices[index];
                if (slice) {
                  onSelect(slice);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {slices.map((slice: SpendingSlice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const slice: SpendingSlice | undefined = active ? (payload?.[0]?.payload as SpendingSlice | undefined) : undefined;
                return slice ? (
                  <Box px="2" py="1" style={{ background: 'var(--color-panel-solid)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-2)' }}>
                    <Text size="1">
                      {slice.label} : {formatCents(slice.cents)}
                    </Text>
                  </Box>
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <Flex position="absolute" inset="0" direction="column" align="center" justify="center" style={{ pointerEvents: 'none' }}>
          <Text size="1" color="gray">
            Dépensé
          </Text>
          <Money cents={total} weight="bold" size="2" />
        </Flex>
      </Box>
      <Flex direction="column" gap="1" flexGrow="1" width="100%" minWidth="0">
        {slices.map((slice: SpendingSlice) => (
          <Flex
            key={slice.key}
            asChild
            align="center"
            gap="2"
            px="2"
            py="1"
            style={{ border: 'none', background: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', borderRadius: 'var(--radius-2)', textAlign: 'left', width: '100%' }}
          >
            <button type="button" onClick={() => onSelect(slice)} aria-label={`Voir les transactions : ${slice.label}`}>
              <Box flexShrink="0" width="10px" height="10px" style={{ borderRadius: '999px', background: slice.color }} />
              <Text size="2" truncate style={{ flexGrow: 1 }}>
                {slice.emoji ? `${slice.emoji} ` : ''}
                {slice.label}
              </Text>
              <Money cents={slice.cents} size="2" />
              <Text size="1" color="gray" className="tabular" style={{ width: 36, textAlign: 'right' }}>
                {formatPercent(total > 0 ? slice.cents / total : null)}
              </Text>
            </button>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
