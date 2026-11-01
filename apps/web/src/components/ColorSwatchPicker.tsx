import { Flex } from '@radix-ui/themes';
import { COLORS, type Color } from '@bank/shared';

/** French names for screen readers and tooltips. */
export const COLOR_LABELS: Record<Color, string> = {
  gray: 'Gris',
  tomato: 'Tomate',
  red: 'Rouge',
  ruby: 'Rubis',
  crimson: 'Cramoisi',
  pink: 'Rose',
  plum: 'Prune',
  purple: 'Pourpre',
  violet: 'Violet',
  iris: 'Iris',
  indigo: 'Indigo',
  blue: 'Bleu',
  cyan: 'Cyan',
  teal: 'Sarcelle',
  jade: 'Jade',
  green: 'Vert',
  grass: 'Herbe',
  brown: 'Brun',
  orange: 'Orange',
  amber: 'Ambre',
  yellow: 'Jaune',
  lime: 'Citron vert',
  mint: 'Menthe',
  sky: 'Ciel',
  gold: 'Or',
  bronze: 'Bronze',
};

interface ColorSwatchPickerProps {
  value: Color;
  onChange: (color: Color) => void;
  /** Accessible name of the group. */
  label?: string;
}

/** Round swatches of the Radix accent colors (categories, goals). The selected one gets a ring. */
export function ColorSwatchPicker({ value, onChange, label = 'Couleur' }: ColorSwatchPickerProps) {
  return (
    <Flex wrap="wrap" gap="2" role="group" aria-label={label}>
      {COLORS.map((color: Color) => {
        const selected: boolean = color === value;
        return (
          <button
            key={color}
            type="button"
            aria-pressed={selected}
            aria-label={COLOR_LABELS[color]}
            title={COLOR_LABELS[color]}
            onClick={() => onChange(color)}
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              background: `var(--${color}-9)`,
              // Two rings (background then text color) so the selection reads in light and dark themes.
              boxShadow: selected ? '0 0 0 2px var(--color-background), 0 0 0 4px var(--gray-12)' : 'inset 0 0 0 1px var(--gray-a6)',
            }}
          />
        );
      })}
    </Flex>
  );
}
