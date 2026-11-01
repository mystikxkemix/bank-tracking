import { CalendarIcon, ResetIcon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Heading, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { currentMonthKey } from '@bank/shared';
import { formatMonth, formatToday } from '../lib/format';
import { monthProgress, type MonthProgress } from '../lib/monthProgress';
import { MonthPicker } from './MonthPicker';

interface MonthHeaderProps {
  /** Page name, shown small above the month (the month is the real title of a monthly page). */
  title: string;
  description?: string;
  month: string;
  onChange: (month: string) => void;
  /** Right side of the month row (buttons). */
  actions?: ReactNode;
}

/**
 * Header of the monthly pages (design direction 2): big month title with arrows, then a chip that says where we are
 * in the current month, or a way back to it. Pair it with useMonthParam().
 */
export function MonthHeader({ title, description, month, onChange, actions }: MonthHeaderProps) {
  const progress: MonthProgress | null = monthProgress(month);
  const thisMonth: string = currentMonthKey();

  return (
    <Flex direction="column" gap="2" mb="5">
      <Heading as="h1" size="2" weight="medium" color="gray" className="eyebrow">
        {title}
      </Heading>
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Flex align="center" gap="3" wrap="wrap" width={{ initial: '100%', sm: 'auto' }}>
          <MonthPicker month={month} onChange={onChange} asTitle />
          {progress ? (
            <Badge size="2" variant="soft" radius="full" className="today-chip">
              <CalendarIcon aria-hidden="true" />
              Aujourd'hui, {formatToday(new Date())} · {progress.daysLeft} jour{progress.daysLeft > 1 ? 's' : ''} restant{progress.daysLeft > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Button size="1" variant="soft" color="gray" radius="full" onClick={() => onChange(thisMonth)}>
              <ResetIcon aria-hidden="true" /> Revenir à {formatMonth(thisMonth)}
            </Button>
          )}
        </Flex>
        {actions && (
          <Flex gap="2" align="center" wrap="wrap">
            {actions}
          </Flex>
        )}
      </Flex>
      {description && (
        <Text as="p" size="2" color="gray">
          {description}
        </Text>
      )}
    </Flex>
  );
}
