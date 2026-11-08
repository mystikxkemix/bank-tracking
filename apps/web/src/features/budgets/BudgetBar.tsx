import { Box } from '@radix-ui/themes';

export type BudgetState = 'over' | 'warning' | 'ok';

/**
 * Group label, color and order of each state. Thresholds follow the feature context: amber from 80 %, red over 100 %.
 * `badgeColor` undefined = the accent (design direction 2: ok is teal).
 */
export const BUDGET_STATES: Record<BudgetState, { label: string; cssColor: string; badgeColor: 'red' | 'amber' | undefined }> = {
  over: { label: 'Dépassé', cssColor: 'var(--red-9)', badgeColor: 'red' },
  warning: { label: 'Presque épuisé', cssColor: 'var(--amber-9)', badgeColor: 'amber' },
  ok: { label: 'Disponible', cssColor: 'var(--accent-9)', badgeColor: undefined },
};

export const BUDGET_STATE_ORDER: BudgetState[] = ['over', 'warning', 'ok'];

export function budgetState(spentCents: number, limitCents: number): BudgetState {
  if (spentCents > limitCents) {
    return 'over';
  }
  return spentCents >= limitCents * 0.8 ? 'warning' : 'ok';
}

interface BudgetBarProps {
  spentCents: number;
  limitCents: number;
  /** Elapsed share of the month (0..1): draws the "today" marker. null on past / future months. */
  todayRatio: number | null;
  /** Accessible name, e.g. "Courses". */
  label: string;
  height?: number;
}

/**
 * Spent / limit bar with a "today" tick: when the fill is right of the tick, spending runs ahead of the month.
 * Custom instead of Radix Progress because Progress has no marker.
 */
export function BudgetBar({ spentCents, limitCents, todayRatio, label, height = 8 }: BudgetBarProps) {
  const ratio: number = limitCents > 0 ? spentCents / limitCents : 0;
  const color: string = BUDGET_STATES[budgetState(spentCents, limitCents)].cssColor;
  const percent: number = Math.round(ratio * 100);

  return (
    <Box
      role="progressbar"
      aria-label={`${label} : ${percent} % du budget`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
      position="relative"
      width="100%"
      style={{ height, borderRadius: 'var(--radius-thumb)', background: 'var(--gray-a4)' }}
    >
      <Box
        position="absolute"
        top="0"
        left="0"
        bottom="0"
        style={{ width: `${Math.max(0, Math.min(ratio, 1)) * 100}%`, borderRadius: 'inherit', background: color }}
      />
      {todayRatio !== null && (
        <Box
          position="absolute"
          title="Aujourd'hui"
          style={{ left: `${todayRatio * 100}%`, top: -3, bottom: -3, width: 2, marginLeft: -1, borderRadius: 1, background: 'var(--gray-12)' }}
        />
      )}
    </Box>
  );
}
