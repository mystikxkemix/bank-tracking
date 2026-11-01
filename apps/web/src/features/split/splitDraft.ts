import { computeSplit, type SplitFrequency, type SplitLineKind, type SplitMonth, type SplitPlanBody, type SplitResult } from '@bank/shared';

/**
 * Editable copy of a split plan. Amounts may be null while the user types (invalid / empty field)
 * and shares keep the raw text ("57,5") so typing a decimal separator is not swallowed.
 */
export interface DraftPerson {
  id: string;
  name: string;
  shareText: string;
}

export interface DraftIncome {
  id: string;
  personId: string;
  label: string;
  amountCents: number | null;
}

export interface DraftLine {
  id: string;
  label: string;
  kind: SplitLineKind;
  amountCents: number | null;
  frequency: SplitFrequency;
}

export interface SplitDraft {
  persons: DraftPerson[];
  incomes: DraftIncome[];
  lines: DraftLine[];
  note: string;
}

export const FREQUENCY_LABELS: Record<SplitFrequency, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

export const LINE_KIND_LABELS: Record<SplitLineKind, { section: string; add: string; placeholder: string }> = {
  charge: { section: 'Charges communes', add: 'Ajouter une charge', placeholder: 'Ex : Prêt immobilier' },
  savings: { section: 'Épargne commune', add: 'Ajouter une épargne', placeholder: 'Ex : Livret A vacances' },
};

/** Line ids are client-generated. randomUUID only exists in secure contexts (HTTPS or localhost): fall back for plain HTTP installs. */
export function newLineId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(16));
  let id: string = '';
  for (const byte of bytes) {
    id += byte.toString(16).padStart(2, '0');
  }
  return id;
}

/** 57.5 -> "57,5" */
export function formatShare(percent: number): string {
  return String(Math.round(percent * 100) / 100).replace('.', ',');
}

/** "57,5" -> 57.5, anything unreadable -> 0. */
export function parseShare(text: string): number {
  const value: number = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

export function toDraft(plan: SplitMonth['plan']): SplitDraft {
  return {
    persons: plan.persons.map((person) => ({ id: person.id, name: person.name, shareText: formatShare(person.sharePercent) })),
    incomes: plan.incomes.map((income) => ({ ...income })),
    lines: plan.lines.map((line) => ({ ...line })),
    note: plan.note ?? '',
  };
}

export function shareTotal(draft: SplitDraft): number {
  let total: number = 0;
  for (const person of draft.persons) {
    total += parseShare(person.shareText);
  }
  return Math.round(total * 100) / 100;
}

/** Live result while editing: empty amounts count as 0. */
export function draftResult(draft: SplitDraft): SplitResult {
  return computeSplit({
    persons: draft.persons.map((person: DraftPerson) => ({ id: person.id, name: person.name, sharePercent: parseShare(person.shareText) })),
    incomes: draft.incomes.map((income: DraftIncome) => ({ ...income, amountCents: income.amountCents ?? 0 })),
    lines: draft.lines.map((line: DraftLine) => ({ ...line, amountCents: line.amountCents ?? 0 })),
  });
}

/** Problems blocking the save, in French, empty when the plan is valid (mirrors splitPlanBodySchema). */
export function validateDraft(draft: SplitDraft): string[] {
  const issues: string[] = [];
  if (draft.persons.length === 0) {
    issues.push('Ajoute au moins une personne.');
  }
  if (draft.persons.some((person: DraftPerson) => person.name.trim() === '')) {
    issues.push('Donne un nom à chaque personne.');
  }
  const total: number = shareTotal(draft);
  if (draft.persons.length > 0 && Math.abs(total - 100) > 0.001) {
    issues.push(`Les parts doivent totaliser 100 % (actuellement ${formatShare(total)} %).`);
  }
  if (draft.incomes.some((income: DraftIncome) => income.label.trim() === '' || income.amountCents === null || income.amountCents < 0)) {
    issues.push('Complète le libellé et un montant positif pour chaque revenu.');
  }
  if (draft.lines.some((line: DraftLine) => line.label.trim() === '' || line.amountCents === null || line.amountCents < 0)) {
    issues.push('Complète le libellé et un montant positif pour chaque ligne commune.');
  }
  return issues;
}

/** Only call on a draft without validation issues. */
export function toPlanBody(draft: SplitDraft): SplitPlanBody {
  return {
    persons: draft.persons.map((person: DraftPerson) => ({ id: person.id, name: person.name.trim(), sharePercent: parseShare(person.shareText) })),
    incomes: draft.incomes.map((income: DraftIncome) => ({ ...income, label: income.label.trim(), amountCents: income.amountCents ?? 0 })),
    lines: draft.lines.map((line: DraftLine) => ({ ...line, label: line.label.trim(), amountCents: line.amountCents ?? 0 })),
    note: draft.note.trim() || null,
  };
}

/** Splits 100 % in `count` shares with 2 decimals, the rounding remainder on the last one (33,33 / 33,33 / 33,34). */
export function equalShares(count: number): number[] {
  const base: number = Math.floor(10000 / count) / 100;
  const shares: number[] = [];
  for (let index = 0; index < count; index++) {
    shares.push(index === count - 1 ? Math.round((100 - base * (count - 1)) * 100) / 100 : base);
  }
  return shares;
}

/** Shares proportional to each person's incomes, or null when there is no income to compare. */
export function proratedShares(draft: SplitDraft): number[] | null {
  const incomeByPerson: Map<string, number> = new Map();
  let total: number = 0;
  for (const income of draft.incomes) {
    const amount: number = income.amountCents ?? 0;
    incomeByPerson.set(income.personId, (incomeByPerson.get(income.personId) ?? 0) + amount);
    total += amount;
  }
  if (total <= 0 || draft.persons.length < 2) {
    return null;
  }
  const shares: number[] = [];
  let allocated: number = 0;
  draft.persons.forEach((person: DraftPerson, index: number) => {
    const isLast: boolean = index === draft.persons.length - 1;
    const share: number = isLast ? Math.round((100 - allocated) * 100) / 100 : Math.round(((incomeByPerson.get(person.id) ?? 0) / total) * 10000) / 100;
    allocated += share;
    shares.push(share);
  });
  return shares;
}
