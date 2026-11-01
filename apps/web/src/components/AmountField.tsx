import { TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { parseAmountToCents } from '@bank/shared';
import { centsToInput } from '../lib/format';

interface AmountFieldProps {
  /** Integer cents, null when empty or invalid. */
  value: number | null;
  onChange: (cents: number | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Euro input accepting "1 234,56" or "1234.56". Keeps the raw text while typing, emits cents. */
export function AmountField({ value, onChange, placeholder = '0,00', ...props }: AmountFieldProps) {
  const [text, setText] = useState<string>(value === null ? '' : centsToInput(value));
  const [lastValue, setLastValue] = useState<number | null>(value);

  // Resync when the value is changed from outside (form reset, edit another item), during render
  // as recommended by React instead of an effect.
  if (value !== lastValue) {
    setLastValue(value);
    if (parseAmountToCents(text, text.includes(',') ? ',' : '.') !== value) {
      setText(value === null ? '' : centsToInput(value));
    }
  }

  return (
    <TextField.Root
      inputMode="decimal"
      className="tabular"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next: string = event.target.value;
        const cents: number | null = parseAmountToCents(next, next.includes(',') ? ',' : '.');
        setText(next);
        setLastValue(cents);
        onChange(cents);
      }}
      onBlur={() => {
        // Normalize the display ("650" -> "650,00") once the user leaves a valid amount.
        if (value !== null) {
          setText(centsToInput(value));
        }
      }}
      {...props}
    >
      <TextField.Slot side="right">€</TextField.Slot>
    </TextField.Root>
  );
}
