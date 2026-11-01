import { Box, Card, Text } from '@radix-ui/themes';
import type { CSSProperties, ReactNode } from 'react';

export interface HeroStat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

interface HeroStripProps {
  /** The answer of the page: big number in the accent color (red when it is bad news). */
  main: HeroStat & { tone?: 'accent' | 'red' };
  /** Secondary figures, separated by thin rules. */
  stats: HeroStat[];
  /** Full-width row under the figures (progress bar...). */
  footer?: ReactNode;
}

/** Design direction 2 hero: headline figure first, then a few stats split by rules. Stacks on phones. */
export function HeroStrip({ main, stats, footer }: HeroStripProps) {
  const style: CSSProperties = { ['--hero-stats' as string]: String(Math.max(1, stats.length)) };
  return (
    <Card size="1" className="hero-card">
      <div className="hero-strip" style={style}>
        <Box className="hero-cell">
          <Text as="div" size="2" color="gray">
            {main.label}
          </Text>
          <Text as="div" size={{ initial: '7', sm: '8' }} weight="bold" className={main.tone === 'red' ? 'hero-big' : 'hero-big hero-big-accent'} color={main.tone === 'red' ? 'red' : undefined}>
            {main.value}
          </Text>
          {main.sub && (
            <Text as="div" size="1" color="gray" mt="1">
              {main.sub}
            </Text>
          )}
        </Box>
        {stats.map((stat: HeroStat) => (
          <Box key={stat.label} className="hero-cell">
            <Text as="div" size="2" color="gray">
              {stat.label}
            </Text>
            <Text as="div" size={{ initial: '3', sm: '5' }} weight="bold" mt="1" className="hero-mid">
              {stat.value}
            </Text>
            {stat.sub && (
              <Text as="div" size="1" color="gray">
                {stat.sub}
              </Text>
            )}
          </Box>
        ))}
      </div>
      {footer && <Box className="hero-footer">{footer}</Box>}
    </Card>
  );
}
