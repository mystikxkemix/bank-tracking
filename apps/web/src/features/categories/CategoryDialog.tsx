import { CheckIcon } from '@radix-ui/react-icons';
import { Box, Button, Dialog, Flex, Grid, SegmentedControl, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent, type ReactNode } from 'react';
import { CATEGORY_KINDS, COLORS, type Category, type CategoryKind, type Color, type CreateCategoryBody } from '@bank/shared';
import { CategoryBadge } from '../../components/CategoryBadge';
import { ErrorCallout } from '../../components/ErrorCallout';
import { CATEGORY_KIND_LABELS, useCreateCategory, useUpdateCategory } from './api';

const KIND_HINTS: Record<CategoryKind, string> = {
  expense: 'Compte dans les dépenses et les budgets.',
  income: 'Compte dans les revenus du mois.',
  transfer: "Argent déplacé entre tes comptes (épargne, virement interne) : exclu des revenus et des dépenses.",
};

/** Spoken names of the swatches (aria-label / tooltip). */
const COLOR_LABELS: Record<Color, string> = {
  gray: 'Gris', tomato: 'Tomate', red: 'Rouge', ruby: 'Rubis', crimson: 'Cramoisi', pink: 'Rose', plum: 'Prune', purple: 'Pourpre',
  violet: 'Violet', iris: 'Iris', indigo: 'Indigo', blue: 'Bleu', cyan: 'Cyan', teal: 'Sarcelle', jade: 'Jade', green: 'Vert',
  grass: 'Herbe', brown: 'Brun', orange: 'Orange', amber: 'Ambre', yellow: 'Jaune', lime: 'Citron vert', mint: 'Menthe', sky: 'Ciel',
  gold: 'Or', bronze: 'Bronze',
};

/** Create (no `category`) or edit dialog: name, kind, color swatches, emoji, live preview. */
export function CategoryDialog({ category, trigger }: { category?: Category; trigger: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [color, setColor] = useState<Color>('indigo');
  const [emoji, setEmoji] = useState<string>('');
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const mutation = category ? updateCategory : createCategory;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const body: CreateCategoryBody = { name: name.trim(), kind, color, emoji: emoji.trim() || null };
    const onSuccess = (): void => setOpen(false);
    if (category) {
      updateCategory.mutate({ id: category.id, body }, { onSuccess });
    } else {
      createCategory.mutate(body, { onSuccess });
    }
  };

  const preview: Category = { id: 'preview', name: name.trim() || 'Aperçu', kind, color, emoji: emoji.trim() || null, createdAt: '' };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) {
          setName(category?.name ?? '');
          setKind(category?.kind ?? 'expense');
          setColor(category?.color ?? 'indigo');
          setEmoji(category?.emoji ?? '');
          mutation.reset();
        }
      }}
    >
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>{category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</Dialog.Title>
        <form onSubmit={submit}>
          <Flex direction="column" gap="4">
            <Flex gap="3">
              <Text as="label" size="2" weight="medium" style={{ width: 88 }}>
                Emoji
                <TextField.Root mt="1" placeholder="🛒" maxLength={16} value={emoji} onChange={(event) => setEmoji(event.target.value)} />
              </Text>
              <Text as="label" size="2" weight="medium" style={{ flexGrow: 1 }}>
                Nom
                <TextField.Root mt="1" placeholder="Ex : Courses" required maxLength={60} autoFocus value={name} onChange={(event) => setName(event.target.value)} />
              </Text>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" id="category-kind-label">
                Type
              </Text>
              <SegmentedControl.Root value={kind} onValueChange={(value: string) => setKind(value as CategoryKind)} aria-labelledby="category-kind-label">
                {CATEGORY_KINDS.map((item: CategoryKind) => (
                  <SegmentedControl.Item key={item} value={item}>
                    {CATEGORY_KIND_LABELS[item]}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>
              <Text size="1" color="gray">
                {KIND_HINTS[kind]}
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" id="category-color-label">
                Couleur
              </Text>
              <Grid columns={{ initial: '9', sm: '13' }} gap="2" role="radiogroup" aria-labelledby="category-color-label">
                {COLORS.map((item: Color) => (
                  <Box
                    key={item}
                    asChild
                    width="28px"
                    height="28px"
                    style={{
                      borderRadius: '999px',
                      background: `var(--${item}-9)`,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      color: `var(--${item}-contrast)`,
                      outline: color === item ? '2px solid var(--gray-12)' : undefined,
                      outlineOffset: 2,
                    }}
                  >
                    <button type="button" role="radio" aria-checked={color === item} aria-label={COLOR_LABELS[item]} title={COLOR_LABELS[item]} onClick={() => setColor(item)}>
                      {color === item && <CheckIcon />}
                    </button>
                  </Box>
                ))}
              </Grid>
            </Flex>

            <Flex align="center" gap="2">
              <Text size="2" color="gray">
                Aperçu
              </Text>
              <CategoryBadge category={preview} />
            </Flex>

            <ErrorCallout error={mutation.error} />
            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
                {category ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
