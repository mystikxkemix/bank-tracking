import type { ObjectId } from 'mongodb';
import { normalizeText, type CategoryKind, type Color } from '@bank/shared';
import { categoriesCollection, type CategoryDoc } from './model';

interface DefaultCategory {
  name: string;
  kind: CategoryKind;
  color: Color;
  emoji: string;
}

/** Starter set created in every new space. Users rename/delete freely. */
const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salaire', kind: 'income', color: 'green', emoji: '💼' },
  { name: 'Autres revenus', kind: 'income', color: 'grass', emoji: '💰' },
  { name: 'Logement', kind: 'expense', color: 'indigo', emoji: '🏠' },
  { name: 'Courses', kind: 'expense', color: 'orange', emoji: '🛒' },
  { name: 'Restaurants', kind: 'expense', color: 'tomato', emoji: '🍽️' },
  { name: 'Transports', kind: 'expense', color: 'blue', emoji: '🚗' },
  { name: 'Abonnements', kind: 'expense', color: 'violet', emoji: '📱' },
  { name: 'Santé', kind: 'expense', color: 'teal', emoji: '🩺' },
  { name: 'Loisirs', kind: 'expense', color: 'pink', emoji: '🎉' },
  { name: 'Shopping', kind: 'expense', color: 'plum', emoji: '🛍️' },
  { name: 'Impôts et frais', kind: 'expense', color: 'gray', emoji: '🧾' },
  { name: 'Épargne', kind: 'transfer', color: 'jade', emoji: '🐷' },
  { name: 'Virements internes', kind: 'transfer', color: 'sky', emoji: '🔁' },
];

export async function seedDefaultCategories(spaceId: ObjectId): Promise<void> {
  const now: Date = new Date();
  const docs: CategoryDoc[] = DEFAULT_CATEGORIES.map((category: DefaultCategory) => ({
    spaceId,
    name: category.name,
    nameKey: normalizeText(category.name),
    kind: category.kind,
    color: category.color,
    emoji: category.emoji,
    createdAt: now,
  }));
  await categoriesCollection().insertMany(docs);
}
