import { Box, Flex, Text } from '@radix-ui/themes';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyStat } from '@bank/shared';
import { formatCents, formatMonth, formatShortMonth } from '../../lib/format';

const compactEuros: Intl.NumberFormat = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

const SERIES: { key: 'incomeCents' | 'expenseCents' | 'netCents'; label: string; color: string }[] = [
  { key: 'incomeCents', label: 'Revenus', color: 'var(--grass-9)' },
  { key: 'expenseCents', label: 'Dépenses', color: 'var(--gray-8)' },
  { key: 'netCents', label: 'Épargne', color: 'var(--accent-9)' },
];

/** 12 months: income and expense bars, savings (net) line. Clicking a month selects it. */
export function TrendChart({ stats, selectedMonth, onSelectMonth }: { stats: MonthlyStat[]; selectedMonth: string; onSelectMonth: (month: string) => void }) {
  return (
    <Box>
      <Flex gap="4" mb="2" wrap="wrap">
        {SERIES.map((serie) => (
          <Flex key={serie.key} align="center" gap="1">
            <Box width={serie.key === 'netCents' ? '14px' : '10px'} height={serie.key === 'netCents' ? '3px' : '10px'} style={{ background: serie.color, borderRadius: 2 }} />
            <Text size="1" color="gray">
              {serie.label}
            </Text>
          </Flex>
        ))}
      </Flex>
      <Box height="240px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={stats}
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            onClick={(state) => {
              const index: number | undefined = typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : Number(state?.activeTooltipIndex ?? NaN);
              const stat: MonthlyStat | undefined = Number.isInteger(index) ? stats[index as number] : undefined;
              if (stat) {
                onSelectMonth(stat.month);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid vertical={false} stroke="var(--gray-a4)" />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => formatShortMonth(month)}
              tick={({ x, y, payload }) => (
                <text x={x} y={Number(y) + 14} textAnchor="middle" fontSize={11} fill={payload.value === selectedMonth ? 'var(--gray-12)' : 'var(--gray-10)'} fontWeight={payload.value === selectedMonth ? 600 : 400}>
                  {formatShortMonth(String(payload.value))}
                </text>
              )}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={2}
            />
            <YAxis
              tickFormatter={(cents: number) => `${compactEuros.format(cents / 100)} €`}
              tick={{ fontSize: 11, fill: 'var(--gray-10)' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: 'var(--gray-a3)' }}
              content={({ active, payload }) => {
                const stat: MonthlyStat | undefined = active ? (payload?.[0]?.payload as MonthlyStat | undefined) : undefined;
                if (!stat) {
                  return null;
                }
                return (
                  <Box px="3" py="2" style={{ background: 'var(--color-panel-solid)', border: '1px solid var(--gray-a6)', borderRadius: 'var(--radius-3)', boxShadow: 'var(--shadow-3)' }}>
                    <Text as="div" size="2" weight="bold" mb="1" style={{ textTransform: 'capitalize' }}>
                      {formatMonth(stat.month)}
                    </Text>
                    {SERIES.map((serie) => (
                      <Flex key={serie.key} justify="between" gap="4">
                        <Text size="1" color="gray">
                          {serie.label}
                        </Text>
                        <Text size="1" className="tabular">
                          {formatCents(stat[serie.key])}
                        </Text>
                      </Flex>
                    ))}
                  </Box>
                );
              }}
            />
            <Bar dataKey="incomeCents" name="Revenus" fill="var(--grass-9)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            <Bar dataKey="expenseCents" name="Dépenses" fill="var(--gray-8)" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            <Line dataKey="netCents" name="Épargne" stroke="var(--accent-9)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--accent-9)' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
