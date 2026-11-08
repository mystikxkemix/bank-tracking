import { Avatar, Text } from '@radix-ui/themes';
import type { Goal } from '@bank/shared';
import { Money } from '../../components/Money';
import { formatDay } from '../../lib/format';
import type { GoalProgress } from './goalMath';

/** Round emoji badge in the goal color (first letter when there is no emoji). */
export function GoalAvatar({ goal, size = '3' }: { goal: Goal; size?: '2' | '3' | '4' }) {
  return <Avatar size={size} radius="full" variant="soft" color={goal.color} fallback={goal.emoji ?? goal.name.slice(0, 1).toUpperCase()} />;
}

/** "Échéance 1 juin 2027" / "≈ 125 €/mois pour y arriver" line shared by the card and the detail dialog. */
export function GoalDeadlineText({ goal, progress }: { goal: Goal; progress: GoalProgress }) {
  if (progress.done) {
    return (
      <Text size="2" color="green">
        Objectif atteint, bravo !
      </Text>
    );
  }
  if (!goal.deadline) {
    return (
      <Text size="2" color="gray">
        Sans échéance
      </Text>
    );
  }
  if (progress.late) {
    return (
      <Text size="2" color="amber">
        Échéance dépassée ({formatDay(goal.deadline)})
      </Text>
    );
  }
  return (
    <Text size="2" color="gray">
      Échéance {formatDay(goal.deadline)} · ≈ <Money cents={progress.monthlyNeededCents ?? 0} weight="medium" />
      /mois pour y arriver
    </Text>
  );
}
