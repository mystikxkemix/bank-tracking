import { CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Card, Flex, Grid, Heading, Progress, Skeleton, Text } from '@radix-ui/themes';
import { useState, type ReactNode } from 'react';
import type { Goal } from '@bank/shared';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { HeroStrip } from '../../components/HeroStrip';
import { Money } from '../../components/Money';
import { PageHeader } from '../../components/PageHeader';
import { useCurrentSpace } from '../../lib/space';
import { useGoals } from './api';
import { GoalDetailDialog } from './GoalDetailDialog';
import { GoalFormDialog } from './GoalFormDialog';
import { GoalAvatar, GoalDeadlineText } from './GoalParts';
import { goalProgress, type GoalProgress } from './goalMath';

/** Savings goals (direction 1): totals first, then a grid of cards; a card opens the detail with contributions. */
export function GoalsPage() {
  const { canEdit } = useCurrentSpace();
  const goals = useGoals();
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);

  const newGoalButton: ReactNode = canEdit ? (
    <GoalFormDialog
      trigger={
        <Button>
          <PlusIcon /> Nouvel objectif
        </Button>
      }
    />
  ) : null;

  const header: ReactNode = <PageHeader title="Objectifs" description="Mets de côté pour tes projets, versement après versement." actions={newGoalButton} />;

  if (goals.isPending) {
    return (
      <>
        {header}
        <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
          <Skeleton height="170px" />
          <Skeleton height="170px" />
          <Skeleton height="170px" />
        </Grid>
      </>
    );
  }
  if (goals.isError) {
    return (
      <>
        {header}
        <ErrorCallout error={goals.error} />
      </>
    );
  }

  const list: Goal[] = goals.data;
  if (list.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon="🎯"
            title="Aucun objectif pour l'instant"
            description={
              canEdit
                ? 'Donne un nom et un montant à ce que tu veux financer (vacances, fonds d’urgence, vélo...), puis note tes versements au fil des mois.'
                : "Les personnes qui gèrent cet espace n'ont pas encore créé d'objectif."
            }
            action={canEdit ? <GoalFormDialog trigger={<Button>Créer un objectif</Button>} /> : undefined}
          />
        </Card>
      </>
    );
  }

  const active: Goal[] = [];
  const done: Goal[] = [];
  let savedCents: number = 0;
  let remainingCents: number = 0;
  let monthlyCents: number = 0;
  for (const goal of list) {
    const progress: GoalProgress = goalProgress(goal);
    savedCents += goal.savedCents;
    if (progress.done) {
      done.push(goal);
    } else {
      active.push(goal);
      remainingCents += progress.remainingCents;
      monthlyCents += progress.monthlyNeededCents ?? 0;
    }
  }
  const openGoal: Goal | undefined = list.find((goal: Goal) => goal.id === openGoalId);

  return (
    <>
      {header}
      <Flex direction="column" gap="5">
        <HeroStrip
          main={{ label: 'Déjà mis de côté', value: <Money cents={savedCents} /> }}
          stats={[
            {
              label: 'Reste à épargner',
              value: <Money cents={remainingCents} />,
              sub: `sur ${active.length} objectif${active.length > 1 ? 's' : ''} en cours`,
            },
            { label: 'Effort mensuel', value: monthlyCents > 0 ? <Money cents={monthlyCents} /> : '-', sub: 'pour tenir les échéances' },
          ]}
        />

        {active.length > 0 && (
          <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
            {active.map((goal: Goal) => (
              <GoalCard key={goal.id} goal={goal} onOpen={() => setOpenGoalId(goal.id)} />
            ))}
          </Grid>
        )}

        {done.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Objectifs atteints</Heading>
            <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
              {done.map((goal: Goal) => (
                <GoalCard key={goal.id} goal={goal} onOpen={() => setOpenGoalId(goal.id)} />
              ))}
            </Grid>
          </Flex>
        )}
      </Flex>

      {openGoal && <GoalDetailDialog goal={openGoal} open onOpenChange={(open: boolean) => !open && setOpenGoalId(null)} />}
    </>
  );
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const progress: GoalProgress = goalProgress(goal);
  return (
    <Card asChild size="2" variant={progress.done ? 'classic' : 'surface'}>
      <button type="button" onClick={onOpen} aria-label={`Ouvrir l'objectif ${goal.name}`} style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}>
        <Flex direction="column" gap="3">
          <Flex align="center" gap="3">
            <GoalAvatar goal={goal} />
            <Box flexGrow="1" minWidth="0">
              <Text as="div" weight="bold" truncate>
                {goal.name}
              </Text>
              <Text as="div" size="1" color="gray">
                {goal.contributions.length} versement{goal.contributions.length > 1 ? 's' : ''}
              </Text>
            </Box>
            {progress.done && (
              <Badge color="green" size="2">
                <CheckIcon /> Atteint
              </Badge>
            )}
          </Flex>
          <Progress value={progress.ratio * 100} color={progress.done ? 'green' : goal.color} size="2" aria-label={`Progression ${goal.name}`} />
          <Flex justify="between" align="baseline" gap="2">
            <Text size="2">
              <Money cents={goal.savedCents} weight="bold" /> <Text color="gray">sur</Text> <Money cents={goal.targetCents} />
            </Text>
            <Text size="2" color="gray">
              {Math.round(progress.ratio * 100)} %
            </Text>
          </Flex>
          <GoalDeadlineText goal={goal} progress={progress} />
        </Flex>
      </button>
    </Card>
  );
}
