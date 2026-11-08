import { Flex, Heading, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

/** Shown instead of an empty list: says what is missing and offers the next action. */
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <Flex direction="column" align="center" gap="2" py="8" px="4" style={{ textAlign: 'center' }}>
      {icon && <Text size="8">{icon}</Text>}
      <Heading size="4">{title}</Heading>
      {description && (
        <Text color="gray" size="2" style={{ maxWidth: 420 }}>
          {description}
        </Text>
      )}
      {action && <Flex mt="3">{action}</Flex>}
    </Flex>
  );
}
