import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button, Checkbox, Dialog, Flex, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Category, CategoryKind, CreateRuleBody, Rule } from '@bank/shared';
import { CategoryBadge } from '../../components/CategoryBadge';
import { CategoryPicker } from '../../components/CategoryPicker';
import { ErrorCallout } from '../../components/ErrorCallout';
import { useApplyRules, useCategories, useCreateRule, useUpdateRule } from './api';

interface RuleDialogProps {
  /** Edit mode when set. */
  rule?: Rule;
  /** Prefill for creation (e.g. from a transaction label). */
  initialPattern?: string;
  initialCategoryId?: string | null;
  /** Kind listed first in the category picker. */
  preferKind?: CategoryKind;
  /** Uncontrolled mode: element opening the dialog. */
  trigger?: ReactNode;
  /** Controlled mode (opened from a menu item). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called with a short French summary once saved (and applied). */
  onSaved?: (message: string) => void;
}

/** Create or edit a "label contains X => category" rule. Creation can apply it right away to uncategorized transactions. */
export function RuleDialog({ rule, initialPattern = '', initialCategoryId = null, preferKind, trigger, open, onOpenChange, onSaved }: RuleDialogProps) {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isOpen: boolean = open ?? internalOpen;
  const [pattern, setPattern] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<string>('100');
  const [applyNow, setApplyNow] = useState<boolean>(true);
  const [lastOpen, setLastOpen] = useState<boolean>(false);
  const categories: Category[] = useCategories().data ?? [];
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const applyRules = useApplyRules();
  const mutation = rule ? updateRule : createRule;

  // Reset the form each time the dialog opens (controlled or not), during render instead of an effect.
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setPattern(rule?.pattern ?? initialPattern);
      setCategoryId(rule?.categoryId ?? initialCategoryId);
      setPriority(String(rule?.priority ?? 100));
      setApplyNow(true);
      createRule.reset();
      updateRule.reset();
      applyRules.reset();
    }
  }

  const setOpen = (next: boolean): void => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const selected: Category | undefined = categories.find((item: Category) => item.id === categoryId);
  const priorityValue: number = Number.parseInt(priority, 10);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!categoryId) {
      return;
    }
    const body: CreateRuleBody & { categoryId: string } = { pattern: pattern.trim(), categoryId, priority: Number.isFinite(priorityValue) ? priorityValue : 100 };
    if (rule) {
      updateRule.mutate({ id: rule.id, body }, { onSuccess: () => { setOpen(false); onSaved?.(`Règle « ${body.pattern} » enregistrée.`); } });
      return;
    }
    createRule.mutate(body, {
      onSuccess: () => {
        if (!applyNow) {
          setOpen(false);
          onSaved?.(`Règle « ${body.pattern} » créée.`);
          return;
        }
        applyRules.mutate(
          { onlyUncategorized: true },
          {
            onSuccess: ({ updated }) => {
              setOpen(false);
              onSaved?.(`Règle « ${body.pattern} » créée : ${updated} transaction${updated > 1 ? 's' : ''} catégorisée${updated > 1 ? 's' : ''}.`);
            },
          },
        );
      },
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}
      <Dialog.Content maxWidth="460px">
        <Dialog.Title>{rule ? 'Modifier la règle' : 'Nouvelle règle'}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Si le libellé bancaire contient le texte (majuscules et accents ignorés), la transaction est classée dans la catégorie.
        </Dialog.Description>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3">
            <Text as="label" size="2" weight="medium">
              Le libellé contient
              <TextField.Root mt="1" placeholder="Ex : CARREFOUR" required minLength={2} maxLength={100} autoFocus value={pattern} onChange={(event) => setPattern(event.target.value)} />
            </Text>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" id="rule-category-label">
                Alors classer en
              </Text>
              <CategoryPicker
                categories={categories}
                value={categoryId}
                preferKind={preferKind}
                onSelect={(id: string | null) => setCategoryId(id)}
                trigger={
                  <Button type="button" variant="surface" color="gray" aria-labelledby="rule-category-label" style={{ justifyContent: 'space-between' }}>
                    {selected ? <CategoryBadge category={selected} size="1" /> : <Text color="gray">Choisir une catégorie</Text>}
                    <ChevronDownIcon />
                  </Button>
                }
              />
            </Flex>
            <Text as="label" size="2" weight="medium">
              Priorité
              <TextField.Root mt="1" type="number" min={0} max={10000} value={priority} onChange={(event) => setPriority(event.target.value)} />
              <Text as="div" size="1" color="gray" weight="regular" mt="1">
                Si plusieurs règles correspondent, la plus petite priorité gagne.
              </Text>
            </Text>
            {!rule && (
              <Text as="label" size="2">
                <Flex gap="2" align="center">
                  <Checkbox checked={applyNow} onCheckedChange={(checked) => setApplyNow(checked === true)} />
                  Appliquer tout de suite aux transactions non catégorisées
                </Flex>
              </Text>
            )}
            <ErrorCallout error={mutation.error ?? applyRules.error} />
            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!categoryId || pattern.trim().length < 2} loading={mutation.isPending || applyRules.isPending}>
                {rule ? 'Enregistrer' : 'Créer la règle'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
