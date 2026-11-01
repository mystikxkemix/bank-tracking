import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Flex, Heading, IconButton, Text } from '@radix-ui/themes';
import { addMonths } from '@bank/shared';
import { formatMonth } from '../lib/format';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
  /** Big month title between the arrows (D2 month header). Spreads across the width on phones. */
  asTitle?: boolean;
}

/** "< octobre 2026 >". Pair it with useMonthParam() so the month lives in the URL. */
export function MonthPicker({ month, onChange, asTitle = false }: MonthPickerProps) {
  const label: string = formatMonth(month);
  return (
    <Flex
      align="center"
      gap={asTitle ? '3' : '2'}
      justify={asTitle ? { initial: 'between', sm: 'start' } : undefined}
      width={asTitle ? { initial: '100%', sm: 'auto' } : undefined}
    >
      <IconButton variant="soft" color="gray" radius={asTitle ? 'full' : undefined} aria-label="Mois précédent" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </IconButton>
      {asTitle ? (
        <Heading as="h2" size={{ initial: '6', sm: '7' }} className="month-title" aria-live="polite">
          {label}
        </Heading>
      ) : (
        <Text weight="medium" style={{ minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
          {label}
        </Text>
      )}
      <IconButton variant="soft" color="gray" radius={asTitle ? 'full' : undefined} aria-label="Mois suivant" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRightIcon />
      </IconButton>
    </Flex>
  );
}
