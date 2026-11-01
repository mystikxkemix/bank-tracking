import { CheckIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Box, Flex, Popover, ScrollArea, Text, TextField } from '@radix-ui/themes';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { normalizeText, type Category, type CategoryKind } from '@bank/shared';

const KIND_ORDER: CategoryKind[] = ['expense', 'income', 'transfer'];

const KIND_GROUP_LABELS: Record<CategoryKind, string> = {
  expense: 'Dépenses',
  income: 'Revenus',
  transfer: 'Virements internes',
};

/** One selectable line of the list. `id` null = "Non catégorisé". */
interface PickerOption {
  id: string | null;
  category: Category | null;
  group: string;
}

interface CategoryPickerProps {
  /** Element opening the picker (a Button, usually showing the current CategoryBadge). */
  trigger: ReactNode;
  categories: Category[];
  /** Current category id, shown with a check mark. */
  value?: string | null;
  onSelect: (categoryId: string | null) => void;
  /** Adds a "Non catégorisé" option (to clear a category). */
  allowNone?: boolean;
  /** Kind listed first, e.g. `income` for a positive amount. Defaults to expenses first. */
  preferKind?: CategoryKind;
  /** Extra content under the list (e.g. a "Créer une règle" link). Receives a function closing the popover. */
  footer?: (close: () => void) => ReactNode;
  align?: 'start' | 'center' | 'end';
}

/**
 * Category combobox: Popover + search field + filtered list, keyboard friendly (arrows, Enter, Escape).
 * Radix Themes has no Combobox, hence this small listbox with aria-activedescendant.
 */
export function CategoryPicker({ trigger, categories, value, onSelect, allowNone = false, preferKind = 'expense', footer, align = 'start' }: CategoryPickerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [highlight, setHighlight] = useState<number>(0);
  const listId: string = useId();

  const options: PickerOption[] = buildOptions(categories, query, allowNone, preferKind);
  const safeHighlight: number = Math.min(highlight, Math.max(options.length - 1, 0));

  const choose = (option: PickerOption): void => {
    onSelect(option.id);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(Math.min(safeHighlight + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(Math.max(safeHighlight - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option: PickerOption | undefined = options[safeHighlight];
      if (option) {
        choose(option);
      }
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) {
          setQuery('');
          setHighlight(0);
        }
      }}
    >
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content size="1" width="280px" align={align} onClick={(event) => event.stopPropagation()}>
        <TextField.Root
          size="2"
          placeholder="Rechercher une catégorie"
          aria-label="Rechercher une catégorie"
          autoFocus
          value={query}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={options[safeHighlight] ? `${listId}-${safeHighlight}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 280 }}>
          <Box id={listId} role="listbox" aria-label="Catégories" mt="2" pr="2">
            {options.length === 0 && (
              <Text as="p" size="2" color="gray" my="2" align="center">
                Aucune catégorie trouvée
              </Text>
            )}
            {options.map((option: PickerOption, index: number) => (
              <Box key={option.id ?? 'none'}>
                {options[index - 1]?.group !== option.group && (
                  <Box mt={index === 0 ? '0' : '2'} mb="1" px="2">
                    <Text size="1" color="gray" weight="medium">
                      {option.group}
                    </Text>
                  </Box>
                )}
                <Flex
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === safeHighlight}
                  align="center"
                  gap="2"
                  px="2"
                  py="1"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-2)',
                    background: index === safeHighlight ? 'var(--accent-a4)' : undefined,
                  }}
                >
                  <Text size="2" style={{ width: '1.4em', textAlign: 'center' }} aria-hidden="true">
                    {option.category ? (option.category.emoji ?? '•') : '∅'}
                  </Text>
                  <Text size="2" truncate style={{ flexGrow: 1 }}>
                    {option.category ? option.category.name : 'Non catégorisé'}
                  </Text>
                  {(value ?? null) === option.id && (
                    <Text className="text-accent" aria-label="Catégorie actuelle">
                      <CheckIcon />
                    </Text>
                  )}
                </Flex>
              </Box>
            ))}
          </Box>
        </ScrollArea>
        {footer && <Box mt="2">{footer(() => setOpen(false))}</Box>}
      </Popover.Content>
    </Popover.Root>
  );
}

/** Filtered options, preferred kind first, then the other kinds, "Non catégorisé" last. */
function buildOptions(categories: Category[], query: string, allowNone: boolean, preferKind: CategoryKind): PickerOption[] {
  const needle: string = normalizeText(query);
  const kinds: CategoryKind[] = [preferKind];
  for (const kind of KIND_ORDER) {
    if (kind !== preferKind) {
      kinds.push(kind);
    }
  }
  const options: PickerOption[] = [];
  for (const kind of kinds) {
    for (const category of categories) {
      if (category.kind === kind && (!needle || normalizeText(category.name).includes(needle))) {
        options.push({ id: category.id, category, group: KIND_GROUP_LABELS[kind] });
      }
    }
  }
  if (allowNone && (!needle || normalizeText('Non catégorisé').includes(needle))) {
    options.push({ id: null, category: null, group: 'Autre' });
  }
  return options;
}
