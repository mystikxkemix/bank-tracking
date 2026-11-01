import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

/** Title row of every page. `actions` sits on the right (buttons, month picker...). */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <Flex justify="between" align={{ initial: 'start', sm: 'center' }} direction={{ initial: 'column', sm: 'row' }} gap="3" mb="5">
      <Box>
        <Heading size="7">{title}</Heading>
        {description && (
          <Text as="p" color="gray" size="2" mt="1">
            {description}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap="2" align="center" wrap="wrap">
          {actions}
        </Flex>
      )}
    </Flex>
  );
}
