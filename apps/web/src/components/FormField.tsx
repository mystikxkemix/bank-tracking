import { Flex, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: ReactNode;
  /** Short help under the input (format, consequence). */
  hint?: ReactNode;
  /** Wrap in a <label> (text inputs). Use false for Select / custom controls that are not labelable elements. */
  asLabel?: boolean;
  children: ReactNode;
}

/** Label + control + optional hint, the layout of every form field in dialogs and settings cards. */
export function FormField({ label, hint, asLabel = true, children }: FormFieldProps) {
  return (
    <Text as={asLabel ? 'label' : 'div'} size="2" weight="medium">
      <Flex direction="column" gap="1">
        {label}
        {children}
        {hint && (
          <Text size="1" color="gray" weight="regular">
            {hint}
          </Text>
        )}
      </Flex>
    </Text>
  );
}
