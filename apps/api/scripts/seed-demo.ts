/**
 * Demo data for local UI work and agent verification. Run: npm run seed:demo -w @bank/api
 * Refuses to run unless MONGODB_DB looks disposable (demo / seed / test / smoke) and wipes that database first.
 *
 * Demo logins (local throwaway databases only):
 *   mike@demo.local  / demo-password  admin, owner of "Foyer" and of his personal space
 *   julie@demo.local / demo-password  editor of "Foyer"
 *   lecteur@demo.local / demo-password  viewer of "Foyer" (read-only UI)
 */
import { ObjectId, type WithId } from 'mongodb';
import { computeSplit, normalizeText, type SplitIncome, type SplitLine, type SplitPerson } from '@bank/shared';
import { config } from '../src/config';
import { closeDb, connectDb, getDb } from '../src/db';
import { accountsCollection } from '../src/features/accounts/model';
import { insertUser } from '../src/features/auth/service';
import { budgetsCollection } from '../src/features/budgets/model';
import { categoriesCollection, rulesCollection, type CategoryDoc } from '../src/features/categories/model';
import { features } from '../src/features';
import { goalsCollection } from '../src/features/goals/model';
import { importsCollection } from '../src/features/imports/model';
import { spacesCollection } from '../src/features/spaces/model';
import { createSpace } from '../src/features/spaces/service';
import { splitMonthsCollection } from '../src/features/split/model';
import { transactionsCollection, type TransactionDoc } from '../src/features/transactions/model';

const PASSWORD: string = 'demo-password';
const MONTHS: string[] = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

if (!/(demo|seed|test|smoke)/i.test(config.MONGODB_DB)) {
  console.error(`Refusing to seed "${config.MONGODB_DB}": use a disposable database name (demo, seed, test, smoke).`);
  process.exit(1);
}

/** Deterministic PRNG so every run produces the same data. */
let randomState: number = 42;
function random(): number {
  randomState = (randomState * 1664525 + 1013904223) % 4294967296;
  return randomState / 4294967296;
}
function between(min: number, max: number): number {
  return Math.round(min + random() * (max - min));
}
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

interface DraftTransaction {
  day: number;
  label: string;
  amountCents: number;
  /** Category name, null = left uncategorized (review queue). */
  category: string | null;
}

function foyerMonth(month: string, isLast: boolean): DraftTransaction[] {
  const rows: DraftTransaction[] = [
    { day: 1, label: 'VIR SALAIRE ACME SAS MIKE', amountCents: 320_000, category: 'Salaire' },
    { day: 2, label: 'VIR SALAIRE CLINIQUE DU PARC JULIE', amountCents: 240_000, category: 'Salaire' },
    { day: 5, label: 'PRLV PRET IMMO CREDIT AGRICOLE', amountCents: -115_000, category: 'Logement' },
    { day: 8, label: 'PRLV EDF CLIENTS PARTICULIERS', amountCents: -between(8_500, 11_000), category: 'Logement' },
    { day: 10, label: 'PRLV FREE MOBILE / FREEBOX', amountCents: -3_499, category: 'Abonnements' },
    { day: 12, label: 'PRLV NETFLIX.COM', amountCents: -1_349, category: 'Abonnements' },
    { day: 3, label: 'VIR EPARGNE COMMUNE LIVRET A', amountCents: -40_000, category: 'Épargne' },
    { day: 3, label: 'VIR RETOUR COMPTE PERSO MIKE', amountCents: -202_800, category: 'Virements internes' },
    { day: 3, label: 'VIR RETOUR COMPTE PERSO JULIE', amountCents: -161_867, category: 'Virements internes' },
  ];
  for (let week: number = 0; week < 4; week += 1) {
    rows.push({ day: 4 + week * 7, label: pick(['CB CARREFOUR MARKET 3215', 'CB E.LECLERC ANGERS', 'CB BIOCOOP CENTRE']), amountCents: -between(6_000, 16_000), category: 'Courses' });
  }
  rows.push({ day: 14, label: pick(['CB LE PETIT BISTROT', 'CB SUSHI SHOP', 'CB PIZZERIA NAPOLI']), amountCents: -between(3_000, 9_000), category: 'Restaurants' });
  rows.push({ day: 21, label: pick(['CB DELIVEROO', 'CB BURGER KING']), amountCents: -between(2_000, 4_500), category: 'Restaurants' });
  rows.push({ day: 17, label: 'CB SNCF CONNECT', amountCents: -between(4_000, 12_000), category: 'Transports' });
  rows.push({ day: 19, label: 'CB TOTALENERGIES STATION', amountCents: -between(5_000, 8_000), category: 'Transports' });
  rows.push({ day: 24, label: pick(['CB CINEMA PATHE', 'CB FNAC', 'CB DECATHLON']), amountCents: -between(2_500, 9_000), category: 'Loisirs' });
  rows.push({ day: 26, label: 'CB PHARMACIE DU MARCHE', amountCents: -between(1_200, 4_000), category: 'Santé' });
  if (month === '2026-09') {
    rows.push({ day: 15, label: 'PRLV MAIF ASSURANCE HABITATION', amountCents: -42_000, category: 'Logement' });
  }
  if (month === '2026-10') {
    rows.push({ day: 15, label: 'PRLV DGFIP TAXE FONCIERE', amountCents: -130_000, category: 'Impôts et frais' });
    rows.push({ day: 27, label: 'CB IKEA NANTES', amountCents: -18_990, category: 'Shopping' });
  }
  if (month === '2026-07') {
    rows.push({ day: 20, label: 'CB AIRBNB VACANCES', amountCents: -64_000, category: 'Loisirs' });
  }
  // The last import is left partly uncategorized so the review queue has work.
  if (isLast) {
    rows.push({ day: 22, label: 'CB AMAZON PAYMENTS', amountCents: -4_599, category: null });
    rows.push({ day: 23, label: 'CB LEROY MERLIN', amountCents: -12_750, category: null });
    rows.push({ day: 25, label: 'VIR REMBOURSEMENT CPAM', amountCents: 2_340, category: null });
    rows.push({ day: 28, label: 'CB BOULANGERIE LOUISE', amountCents: -870, category: null });
    rows.push({ day: 29, label: 'PRLV CANAL+', amountCents: -2_799, category: null });
  }
  return rows;
}

async function main(): Promise<void> {
  await connectDb();
  await getDb().dropDatabase();
  for (const feature of features) {
    await feature.ensureIndexes?.();
  }

  const mike = await insertUser('mike@demo.local', 'Mike', PASSWORD, true);
  const julie = await insertUser('julie@demo.local', 'Julie', PASSWORD, false);
  const viewer = await insertUser('lecteur@demo.local', 'Lecteur', PASSWORD, false);

  const foyer = await createSpace(mike._id, 'Foyer');
  const foyerId: ObjectId = new ObjectId(foyer.id);
  const now: Date = new Date();
  await spacesCollection().updateOne(
    { _id: foyerId },
    { $push: { members: { $each: [{ userId: julie._id, role: 'editor', addedAt: now }, { userId: viewer._id, role: 'viewer', addedAt: now }] } } },
  );

  const categories: WithId<CategoryDoc>[] = await categoriesCollection().find({ spaceId: foyerId }).toArray();
  const categoryId = (name: string): ObjectId => {
    const found: WithId<CategoryDoc> | undefined = categories.find((category: WithId<CategoryDoc>) => category.name === name);
    if (!found) {
      throw new Error(`Unknown category ${name}`);
    }
    return found._id;
  };

  const joint = await accountsCollection().insertOne({ spaceId: foyerId, name: 'Compte joint', kind: 'checking', currency: 'EUR', importProfile: null, createdAt: now });
  await accountsCollection().insertOne({ spaceId: foyerId, name: 'Livret A commun', kind: 'savings', currency: 'EUR', importProfile: null, createdAt: now });

  const transactions: TransactionDoc[] = [];
  for (const [index, month] of MONTHS.entries()) {
    const isLast: boolean = index === MONTHS.length - 1;
    const importResult = await importsCollection().insertOne({
      spaceId: foyerId,
      accountId: joint.insertedId,
      fileName: `releve-joint-${month}.csv`,
      format: 'csv',
      insertedCount: 0,
      duplicateCount: 0,
      skippedCount: 0,
      categorizedCount: 0,
      createdAt: new Date(`${month}-28T19:00:00Z`),
    });
    const rows: DraftTransaction[] = foyerMonth(month, isLast);
    let categorized: number = 0;
    for (const row of rows) {
      const date: Date = new Date(`${month}-${String(row.day).padStart(2, '0')}T00:00:00Z`);
      if (row.category) {
        categorized += 1;
      }
      transactions.push({
        spaceId: foyerId,
        accountId: joint.insertedId,
        date,
        label: row.label,
        rawLabel: row.label,
        amountCents: row.amountCents,
        categoryId: row.category ? categoryId(row.category) : null,
        note: null,
        importId: importResult.insertedId,
        dedupKey: `${month}-${row.day}|${row.amountCents}|${normalizeText(row.label)}|0`,
        createdAt: date,
        updatedAt: date,
      });
    }
    await importsCollection().updateOne({ _id: importResult.insertedId }, { $set: { insertedCount: rows.length, categorizedCount: categorized } });
  }
  await transactionsCollection().insertMany(transactions);

  const rules: [string, string][] = [
    ['carrefour', 'Courses'], ['leclerc', 'Courses'], ['biocoop', 'Courses'], ['sncf', 'Transports'], ['totalenergies', 'Transports'],
    ['netflix', 'Abonnements'], ['free mobile', 'Abonnements'], ['pret immo', 'Logement'], ['edf', 'Logement'], ['vir salaire', 'Salaire'],
  ];
  await rulesCollection().insertMany(
    rules.map(([pattern, category]: [string, string]) => ({ spaceId: foyerId, pattern, patternKey: normalizeText(pattern), categoryId: categoryId(category), priority: 100, createdAt: now })),
  );

  const budgets: [string, number][] = [['Courses', 60_000], ['Restaurants', 15_000], ['Loisirs', 15_000], ['Transports', 25_000], ['Shopping', 10_000]];
  await budgetsCollection().insertMany(
    budgets.map(([category, limit]: [string, number]) => ({ spaceId: foyerId, categoryId: categoryId(category), monthlyLimitCents: limit, updatedAt: now })),
  );

  await goalsCollection().insertMany([
    {
      spaceId: foyerId,
      name: 'Vacances été 2027',
      targetCents: 300_000,
      deadline: new Date('2027-06-30T00:00:00Z'),
      color: 'amber',
      emoji: '🏖️',
      contributions: MONTHS.map((month: string) => ({ _id: new ObjectId(), date: new Date(`${month}-05T00:00:00Z`), amountCents: 20_000, note: null })),
      createdAt: now,
    },
    {
      spaceId: foyerId,
      name: 'Fonds de sécurité',
      targetCents: 1_000_000,
      deadline: null,
      color: 'jade',
      emoji: '🛟',
      contributions: [{ _id: new ObjectId(), date: new Date('2026-05-10T00:00:00Z'), amountCents: 450_000, note: 'Solde initial' }],
      createdAt: now,
    },
  ]);

  const persons: SplitPerson[] = [
    { id: 'p-mike', name: 'Mike', sharePercent: 60 },
    { id: 'p-julie', name: 'Julie', sharePercent: 40 },
  ];
  const incomes: SplitIncome[] = [
    { id: 'i-mike', personId: 'p-mike', label: 'Salaire', amountCents: 320_000 },
    { id: 'i-julie', personId: 'p-julie', label: 'Salaire', amountCents: 240_000 },
  ];
  const lines: SplitLine[] = [
    { id: 'l-pret', label: 'Prêt immobilier', kind: 'charge', amountCents: 115_000, frequency: 'monthly' },
    { id: 'l-assurance', label: 'Assurance habitation', kind: 'charge', amountCents: 42_000, frequency: 'yearly' },
    { id: 'l-fonciere', label: 'Taxe foncière', kind: 'charge', amountCents: 130_000, frequency: 'yearly' },
    { id: 'l-edf', label: 'Électricité', kind: 'charge', amountCents: 9_500, frequency: 'monthly' },
    { id: 'l-internet', label: 'Internet', kind: 'charge', amountCents: 3_499, frequency: 'monthly' },
    { id: 'l-eau', label: 'Eau', kind: 'charge', amountCents: 9_000, frequency: 'quarterly' },
    { id: 'l-epargne', label: 'Épargne commune', kind: 'savings', amountCents: 40_000, frequency: 'monthly' },
  ];
  await splitMonthsCollection().insertOne({
    spaceId: foyerId,
    month: '2026-09',
    persons,
    incomes,
    lines,
    note: null,
    result: computeSplit({ persons, incomes, lines }),
    updatedAt: now,
  });

  // A little data in Mike's personal space so switching spaces shows something different.
  const personalSpace = await spacesCollection().findOne({ 'members.userId': mike._id, _id: { $ne: foyerId } });
  if (personalSpace) {
    await accountsCollection().insertOne({ spaceId: personalSpace._id, name: 'Compte perso', kind: 'checking', currency: 'EUR', importProfile: null, createdAt: now });
  }

  console.log(`Seeded "${config.MONGODB_DB}": ${transactions.length} transactions, space Foyer = ${foyer.id}`);
  console.log('Logins: mike@demo.local (admin, owner), julie@demo.local (editor), lecteur@demo.local (viewer). Password: demo-password');
  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
