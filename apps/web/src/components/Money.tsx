import { Text } from '@radix-ui/themes';
import type { ComponentProps } from 'react';
import { formatCents } from '../lib/format';

type TextProps = ComponentProps<typeof Text>;

interface MoneyProps {
  cents: number;
  /** Green for income ("+12,00 €"), neutral for expenses. Off for totals that are not cash flows. */
  colored?: boolean;
  currency?: string;
  size?: TextProps['size'];
  weight?: TextProps['weight'];
}

/** Every amount in the UI goes through this component: tabular digits, consistent colors and signs. */
export function Money({ cents, colored = false, currency = 'EUR', size, weight }: MoneyProps) {
  const isIncome: boolean = colored && cents > 0;
  return (
    <Text className="tabular" color={isIncome ? 'green' : undefined} size={size} weight={weight}>
      {isIncome ? '+' : ''}
      {formatCents(cents, currency)}
    </Text>
  );
}
