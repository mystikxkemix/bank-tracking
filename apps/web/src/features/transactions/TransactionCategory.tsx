import { ChevronDownIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import { Button, Separator } from '@radix-ui/themes';
import type { Category, Transaction } from '@bank/shared';
import { CategoryBadge } from '../../components/CategoryBadge';
import { CategoryPicker } from '../../components/CategoryPicker';

interface TransactionCategoryProps {
  transaction: Transaction;
  categories: Category[];
  categoriesById: Map<string, Category>;
  canEdit: boolean;
  onChange: (categoryId: string | null) => void;
  /** Opens the rule dialog prefilled from this transaction. */
  onCreateRule?: () => void;
}

/** Category badge of a transaction row. Editors click it to change the category inline (picker with search). */
export function TransactionCategory({ transaction, categories, categoriesById, canEdit, onChange, onCreateRule }: TransactionCategoryProps) {
  const category: Category | undefined = transaction.categoryId ? categoriesById.get(transaction.categoryId) : undefined;
  if (!canEdit) {
    return <CategoryBadge category={category ?? null} size="1" />;
  }
  return (
    <CategoryPicker
      categories={categories}
      value={transaction.categoryId}
      allowNone
      preferKind={transaction.amountCents > 0 ? 'income' : 'expense'}
      onSelect={(id: string | null) => {
        if (id !== transaction.categoryId) {
          onChange(id);
        }
      }}
      footer={
        onCreateRule
          ? (close: () => void) => (
              <>
                <Separator size="4" mb="2" />
                <Button
                  variant="ghost"
                  size="1"
                  onClick={() => {
                    close();
                    onCreateRule();
                  }}
                >
                  <LightningBoltIcon /> Créer une règle depuis ce libellé
                </Button>
              </>
            )
          : undefined
      }
      trigger={
        <Button variant="ghost" color="gray" size="1" aria-label={`Changer la catégorie (actuelle : ${category?.name ?? 'non catégorisé'})`} style={{ maxWidth: '100%' }}>
          <CategoryBadge category={category ?? null} size="1" />
          <ChevronDownIcon />
        </Button>
      }
    />
  );
}
