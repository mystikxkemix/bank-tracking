import type { SplitFrequency, SplitIncome, SplitLine, SplitPerson, SplitPersonResult, SplitResult } from './schemas/split';

const MONTHS_PER_OCCURRENCE: Record<SplitFrequency, number> = { monthly: 1, quarterly: 3, yearly: 12 };

/** 1 300 € yearly -> 108,33 € per month (rounded to the cent). */
export function monthlyAmountCents(line: Pick<SplitLine, 'amountCents' | 'frequency'>): number {
  return Math.round(line.amountCents / MONTHS_PER_OCCURRENCE[line.frequency]);
}

/**
 * Pure computation of the household split, shared by the API (stored results, history)
 * and the web (live recomputation while editing). Contributions are rounded to the cent and the
 * rounding remainder goes to the last person so they always sum exactly to keepOnJointCents.
 */
export function computeSplit(plan: { persons: SplitPerson[]; incomes: SplitIncome[]; lines: SplitLine[] }): SplitResult {
  let monthlyChargesCents: number = 0;
  let monthlySavingsCents: number = 0;
  let provisionCents: number = 0;
  for (const line of plan.lines) {
    const monthly: number = monthlyAmountCents(line);
    if (line.kind === 'savings') {
      monthlySavingsCents += monthly;
    } else {
      monthlyChargesCents += monthly;
      if (line.frequency !== 'monthly') {
        provisionCents += monthly;
      }
    }
  }
  const keepOnJointCents: number = monthlyChargesCents + monthlySavingsCents;

  const incomeByPerson: Map<string, number> = new Map();
  let totalIncomeCents: number = 0;
  for (const income of plan.incomes) {
    incomeByPerson.set(income.personId, (incomeByPerson.get(income.personId) ?? 0) + income.amountCents);
    totalIncomeCents += income.amountCents;
  }

  const persons: SplitPersonResult[] = [];
  let allocated: number = 0;
  plan.persons.forEach((person: SplitPerson, index: number) => {
    const isLast: boolean = index === plan.persons.length - 1;
    const contributionCents: number = isLast ? keepOnJointCents - allocated : Math.round((keepOnJointCents * person.sharePercent) / 100);
    allocated += contributionCents;
    const incomeCents: number = incomeByPerson.get(person.id) ?? 0;
    persons.push({ personId: person.id, incomeCents, contributionCents, returnCents: incomeCents - contributionCents });
  });

  return { totalIncomeCents, monthlyChargesCents, monthlySavingsCents, keepOnJointCents, provisionCents, persons };
}
