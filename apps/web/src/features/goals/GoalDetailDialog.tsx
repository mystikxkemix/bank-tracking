import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Dialog, Flex, Grid, IconButton, Progress, ScrollArea, SegmentedControl, Separator, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import type { Contribution, Goal } from '@bank/shared';
import { AmountField } from '../../components/AmountField';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { Money } from '../../components/Money';
import { formatCents, formatDay } from '../../lib/format';
import { useCurrentSpace } from '../../lib/space';
import { useAddContribution, useDeleteContribution, useDeleteGoal } from './api';
import { GoalForm } from './GoalFormDialog';
import { GoalAvatar, GoalDeadlineText } from './GoalParts';
import { goalProgress, todayIsoDate, type GoalProgress } from './goalMath';

type Direction = 'deposit' | 'withdrawal';

/** Detail of a goal: progress, "Ajouter un versement", contributions list; edit mode swaps the content for the form. */
export function GoalDetailDialog({ goal, open, onOpenChange }: { goal: Goal; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { canEdit } = useCurrentSpace();
  const [editing, setEditing] = useState<boolean>(false);
  const deleteGoal = useDeleteGoal();
  const deleteContribution = useDeleteContribution();
  const progress: GoalProgress = goalProgress(goal);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="560px">
        <Flex align="center" gap="3" mb="4">
          <GoalAvatar goal={goal} size="4" />
          <Box flexGrow="1" minWidth="0">
            <Dialog.Title mb="0">{editing ? "Modifier l'objectif" : goal.name}</Dialog.Title>
            <Dialog.Description size="2" color="gray">
              Objectif de <Money cents={goal.targetCents} />
            </Dialog.Description>
          </Box>
          {progress.done && !editing && (
            <Badge color="green" size="2">
              Atteint
            </Badge>
          )}
        </Flex>

        {editing ? (
          <GoalForm goal={goal} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        ) : (
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
              <Flex justify="between" align="baseline" gap="2" wrap="wrap">
                <Text size="5" weight="bold">
                  <Money cents={goal.savedCents} /> <Text size="3" color="gray" weight="regular">sur</Text>{' '}
                  <Text size="3" weight="regular">
                    <Money cents={goal.targetCents} />
                  </Text>
                </Text>
                <Text size="2" color="gray">
                  {Math.round(progress.ratio * 100)} %
                </Text>
              </Flex>
              <Progress value={progress.ratio * 100} color={progress.done ? 'green' : goal.color} size="3" aria-label={`Progression ${goal.name}`} />
              {!progress.done && (
                <Text size="2" color="gray">
                  Encore <Money cents={progress.remainingCents} weight="medium" /> à mettre de côté.
                </Text>
              )}
              <GoalDeadlineText goal={goal} progress={progress} />
            </Flex>

            {canEdit && <ContributionForm goal={goal} />}

            <Separator size="4" />
            <Box>
              <Text as="div" weight="bold" mb="2">
                Versements
              </Text>
              <ErrorCallout error={deleteContribution.error} />
              {goal.contributions.length === 0 ? (
                <Text size="2" color="gray">
                  Aucun versement pour l'instant.{canEdit ? ' Ajoute le premier ci-dessus.' : ''}
                </Text>
              ) : (
                <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 260 }}>
                  <Flex direction="column" pr="3">
                    {goal.contributions.map((contribution: Contribution, index: number) => (
                      <Flex
                        key={contribution.id}
                        align="center"
                        gap="3"
                        py="2"
                        style={index > 0 ? { borderTop: '1px solid var(--gray-a4)' } : undefined}
                      >
                        <Box flexGrow="1" minWidth="0">
                          <Text as="div" size="2">
                            {formatDay(contribution.date)}
                            {contribution.amountCents < 0 && (
                              <Badge ml="2" size="1" color="gray">
                                Retrait
                              </Badge>
                            )}
                          </Text>
                          {contribution.note && (
                            <Text as="div" size="1" color="gray" truncate>
                              {contribution.note}
                            </Text>
                          )}
                        </Box>
                        <Money cents={contribution.amountCents} colored weight="medium" />
                        {canEdit && (
                          <ConfirmDialog
                            title={contribution.amountCents < 0 ? 'Supprimer ce retrait ?' : 'Supprimer ce versement ?'}
                            description={`${contribution.amountCents < 0 ? 'Le retrait' : 'Le versement'} de ${formatCents(Math.abs(contribution.amountCents))} du ${formatDay(contribution.date)} sera effacé du suivi de l'objectif.`}
                            confirmLabel="Supprimer"
                            onConfirm={() => deleteContribution.mutate({ goalId: goal.id, contributionId: contribution.id })}
                            trigger={
                              <IconButton variant="ghost" color="gray" size="1" aria-label={`Supprimer le versement du ${formatDay(contribution.date)}`}>
                                <TrashIcon />
                              </IconButton>
                            }
                          />
                        )}
                      </Flex>
                    ))}
                  </Flex>
                </ScrollArea>
              )}
            </Box>

            <ErrorCallout error={deleteGoal.error} />
            <Flex gap="3" justify="between" align="center" mt="2" wrap="wrap">
              {canEdit ? (
                <Flex gap="2">
                  <Button variant="soft" color="gray" onClick={() => setEditing(true)}>
                    <Pencil1Icon /> Modifier
                  </Button>
                  <ConfirmDialog
                    title={`Supprimer « ${goal.name} » ?`}
                    description={`L'objectif et ses ${goal.contributions.length} versement${goal.contributions.length > 1 ? 's' : ''} seront supprimés. Ton argent ne bouge pas, seul le suivi disparaît.`}
                    confirmLabel="Supprimer"
                    onConfirm={() => deleteGoal.mutate(goal.id, { onSuccess: () => onOpenChange(false) })}
                    trigger={
                      <Button variant="soft" color="red">
                        <TrashIcon /> Supprimer
                      </Button>
                    }
                  />
                </Flex>
              ) : (
                <Box />
              )}
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Fermer
                </Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** "Ajouter un versement": deposit or withdrawal (sent as a negative amount), date defaults to today. */
function ContributionForm({ goal }: { goal: Goal }) {
  const addContribution = useAddContribution();
  const [direction, setDirection] = useState<Direction>('deposit');
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [date, setDate] = useState<string>(() => todayIsoDate());
  const [note, setNote] = useState<string>('');
  const absolute: number = Math.abs(amountCents ?? 0);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (absolute === 0 || !date) {
      return;
    }
    addContribution.mutate(
      { goalId: goal.id, body: { amountCents: direction === 'withdrawal' ? -absolute : absolute, date, note: note.trim() || null } },
      {
        onSuccess: () => {
          setAmountCents(null);
          setNote('');
        },
      },
    );
  };

  return (
    <Box p="3" style={{ background: 'var(--gray-a2)', borderRadius: 'var(--radius-3)' }}>
      <form onSubmit={submit}>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text weight="bold" size="2">
              {direction === 'deposit' ? 'Ajouter un versement' : 'Noter un retrait'}
            </Text>
            <SegmentedControl.Root size="1" value={direction} onValueChange={(value: string) => setDirection(value as Direction)}>
              <SegmentedControl.Item value="deposit">Versement</SegmentedControl.Item>
              <SegmentedControl.Item value="withdrawal">Retrait</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>
          <Grid columns={{ initial: '1', xs: '1fr 1fr' }} gap="3">
            <FormField label="Montant">
              <AmountField value={amountCents} onChange={setAmountCents} />
            </FormField>
            <FormField label="Date">
              <TextField.Root type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
            </FormField>
          </Grid>
          <FormField label="Note (facultatif)">
            <TextField.Root placeholder="Ex : prime de fin d'année" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
          </FormField>
          <ErrorCallout error={addContribution.error} />
          <Flex justify="end">
            <Button type="submit" loading={addContribution.isPending} disabled={absolute === 0 || !date}>
              {direction === 'deposit' ? 'Ajouter le versement' : 'Ajouter le retrait'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Box>
  );
}
