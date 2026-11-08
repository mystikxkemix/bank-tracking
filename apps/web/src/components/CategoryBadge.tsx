import { Badge } from '@radix-ui/themes';
import type { Category } from '@bank/shared';

/** Category chip used everywhere (lists, dashboard, budgets). `null` = uncategorized. */
export function CategoryBadge({ category, size = '2' }: { category: Category | null | undefined; size?: '1' | '2' | '3' }) {
  if (!category) {
    return (
      <Badge color="gray" variant="outline" size={size}>
        Non catégorisé
      </Badge>
    );
  }
  return (
    <Badge color={category.color} variant="soft" size={size}>
      {category.emoji && <span aria-hidden="true">{category.emoji}</span>}
      {category.name}
    </Badge>
  );
}
