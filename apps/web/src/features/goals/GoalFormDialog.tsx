import { Box, Button, Dialog, Flex, Grid, TextField } from '@radix-ui/themes';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { Color, CreateGoalBody, Goal } from '@bank/shared';
import { AmountField } from '../../components/AmountField';
import { ColorSwatchPicker } from '../../components/ColorSwatchPicker';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { useCreateGoal, useUpdateGoal } from './api';

const EMOJI_SUGGESTIONS: string[] = ['🏖️', '🛟', '🏠', '🚗', '🚲', '🎁', '🎓', '💍', '👶', '💻'];

/** Create (no `goal`) or edit form, used in the "Nouvel objectif" dialog and in the detail dialog edit mode. */
export function GoalForm({ goal, onDone, onCancel }: { goal?: Goal; onDone: (goal: Goal) => void; onCancel: () => void }) {
  const [name, setName] = useState<string>(goal?.name ?? '');
  const [targetCents, setTargetCents] = useState<number | null>(goal?.targetCents ?? null);
  const [deadline, setDeadline] = useState<string>(goal?.deadline ?? '');
  const [emoji, setEmoji] = useState<string>(goal?.emoji ?? '');
  const [color, setColor] = useState<Color>(goal?.color ?? 'indigo');
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const mutation = goal ? updateGoal : createGoal;
  const valid: boolean = name.trim() !== '' && targetCents !== null && targetCents > 0;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!valid || targetCents === null) {
      return;
    }
    // Always send every field: PATCH replaces them all, an emptied deadline or emoji becomes null.
    const body: CreateGoalBody = { name: name.trim(), targetCents, deadline: deadline || null, color, emoji: emoji.trim() || null };
    if (goal) {
      updateGoal.mutate({ id: goal.id, body }, { onSuccess: onDone });
    } else {
      createGoal.mutate(body, { onSuccess: onDone });
    }
  };

  return (
    <form onSubmit={submit}>
      <Flex direction="column" gap="3">
        <FormField label="Nom">
          <TextField.Root placeholder="Ex : Vacances 2027" required autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <Grid columns={{ initial: '1', xs: '2' }} gap="3">
          <FormField label="Montant visé">
            <AmountField value={targetCents} onChange={setTargetCents} placeholder="2 000,00" />
          </FormField>
          <FormField label="Échéance (facultatif)" hint="Pour calculer l'effort par mois.">
            <TextField.Root type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </FormField>
        </Grid>
        <FormField label="Emoji (facultatif)">
          <Flex gap="2" align="center" wrap="wrap">
            <Box width="64px">
              <TextField.Root aria-label="Emoji" maxLength={16} value={emoji} onChange={(event) => setEmoji(event.target.value)} style={{ textAlign: 'center' }} />
            </Box>
            {EMOJI_SUGGESTIONS.map((suggestion: string) => (
              <Button
                key={suggestion}
                type="button"
                size="1"
                variant={emoji === suggestion ? 'solid' : 'soft'}
                color="gray"
                aria-label={`Choisir ${suggestion}`}
                onClick={() => setEmoji(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </Flex>
        </FormField>
        <FormField label="Couleur" asLabel={false}>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </FormField>
        <ErrorCallout error={mutation.error} />
        <Flex gap="3" justify="end" mt="2">
          <Button type="button" variant="soft" color="gray" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={!valid}>
            {goal ? 'Enregistrer' : 'Créer'}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

/** "Nouvel objectif" dialog. The form remounts on each opening so it always starts empty. */
export function GoalFormDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Nouvel objectif</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Tu noteras ensuite chaque versement (ou retrait) pour suivre ta progression.
        </Dialog.Description>
        {open && <GoalForm onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />}
      </Dialog.Content>
    </Dialog.Root>
  );
}
