import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Flex, IconButton, Text } from '@radix-ui/themes';
import { addMonths } from '@bank/shared';
import { formatMonth } from '../lib/format';

/** "< octobre 2026 >". Pair it with useMonthParam() so the month lives in the URL. */
export function MonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <Flex align="center" gap="2">
      <IconButton variant="soft" color="gray" aria-label="Mois précédent" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </IconButton>
      <Text weight="medium" style={{ minWidth: 130, textAlign: 'center', textTransform: 'capitalize' }}>
        {formatMonth(month)}
      </Text>
      <IconButton variant="soft" color="gray" aria-label="Mois suivant" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRightIcon />
      </IconButton>
    </Flex>
  );
}
