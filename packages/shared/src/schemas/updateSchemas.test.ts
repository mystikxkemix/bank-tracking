import { describe, expect, it } from 'vitest';
import { updateCategoryBodySchema, updateRuleBodySchema } from './categories';
import { updateGoalBodySchema } from './goals';

// Regression: zod 4 `.partial()` re-applies inner defaults, which wiped absent fields on PATCH.
describe('update schemas keep absent keys absent', () => {
  it('category', () => {
    expect(updateCategoryBodySchema.parse({ name: 'X' })).toEqual({ name: 'X' });
  });
  it('rule', () => {
    expect(updateRuleBodySchema.parse({ pattern: 'abc' })).toEqual({ pattern: 'abc' });
  });
  it('goal', () => {
    expect(updateGoalBodySchema.parse({ name: 'X' })).toEqual({ name: 'X' });
  });
});
