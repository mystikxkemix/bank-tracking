import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Avatar, Box, Card, Flex, Grid, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import type { SplitPersonResult, SplitResult } from '@bank/shared';
import { Money } from '../../components/Money';
import { CopyAmountButton } from './CopyAmountButton';
import { formatShare, parseShare, type DraftPerson } from './splitDraft';

function BreakdownLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex justify="between" gap="3">
      <Text size="2">{label}</Text>
      <Text size="2">{children}</Text>
    </Flex>
  );
}

export function PersonAvatar({ name, size = '2' }: { name: string; size?: '1' | '2' }) {
  return <Avatar size={size} radius="full" variant="soft" color="gray" fallback={name.trim().slice(0, 2).toUpperCase() || '?'} />;
}

/** The answer of the page (directions 1 + 3): what stays on the joint account, then one card per person, each with a copy button. */
export function SplitResultCards({ result, persons }: { result: SplitResult; persons: DraftPerson[] }) {
  const byId: Map<string, DraftPerson> = new Map();
  for (const person of persons) {
    byId.set(person.id, person);
  }

  return (
    <Grid columns={{ initial: '1', sm: '2', lg: `repeat(${Math.min(result.persons.length + 1, 3)}, minmax(0, 1fr))` }} gap="4">
      <Card size="3" style={{ background: 'var(--accent-a3)', boxShadow: 'inset 0 0 0 1px var(--accent-a6)' }}>
        <Flex direction="column" gap="3" height="100%">
          <Flex justify="between" align="start" gap="2">
            <Text size="2" weight="medium" color="indigo" highContrast>
              <span aria-hidden="true">🏡</span> À garder sur le compte commun
            </Text>
            <CopyAmountButton cents={result.keepOnJointCents} label="à garder sur le compte commun" />
          </Flex>
          <Text size="8" weight="bold" color="indigo" highContrast style={{ letterSpacing: '-0.02em' }}>
            <Money cents={result.keepOnJointCents} />
          </Text>
          <Flex direction="column" gap="1" mt="auto">
            <BreakdownLine label="Charges lissées">
              <Money cents={result.monthlyChargesCents} />
            </BreakdownLine>
            {result.provisionCents > 0 && (
              <Text size="1" color="gray">
                dont <Money cents={result.provisionCents} /> de provision pour les charges trimestrielles ou annuelles
              </Text>
            )}
            <BreakdownLine label="Épargne commune">
              <Money cents={result.monthlySavingsCents} />
            </BreakdownLine>
          </Flex>
        </Flex>
      </Card>

      {result.persons.map((personResult: SplitPersonResult) => {
        const person: DraftPerson | undefined = byId.get(personResult.personId);
        return <PersonResultCard key={personResult.personId} name={person?.name.trim() || 'Sans nom'} share={parseShare(person?.shareText ?? '0')} result={personResult} />;
      })}
    </Grid>
  );
}

function PersonResultCard({ name, share, result }: { name: string; share: number; result: SplitPersonResult }) {
  const mustTopUp: boolean = result.returnCents < 0;
  return (
    <Card size="3" style={mustTopUp ? { background: 'var(--red-a3)', boxShadow: 'inset 0 0 0 1px var(--red-a6)' } : undefined}>
      <Flex direction="column" gap="3" height="100%">
        <Flex justify="between" align="start" gap="2">
          <Flex align="center" gap="2" minWidth="0">
            <PersonAvatar name={name} size="1" />
            <Text size="2" weight="medium" color={mustTopUp ? 'red' : undefined}>
              {mustTopUp ? `${name} doit compléter le commun` : `À virer sur le compte de ${name}`}
            </Text>
          </Flex>
          <CopyAmountButton cents={result.returnCents} label={mustTopUp ? `à compléter par ${name}` : `à virer à ${name}`} />
        </Flex>
        <Text size="7" weight="bold" color={mustTopUp ? 'red' : undefined} style={{ letterSpacing: '-0.02em' }}>
          <Money cents={Math.abs(result.returnCents)} />
        </Text>
        <Box mt="auto">
          {mustTopUp && (
            <Flex gap="2" align="start" mb="2">
              <Text color="red" size="2" aria-hidden="true">
                <ExclamationTriangleIcon />
              </Text>
              <Text size="2" color="red">
                Ses revenus ne couvrent pas sa part : {name} vire ce montant sur le compte commun.
              </Text>
            </Flex>
          )}
          <Text as="div" size="1" color="gray">
            Revenus <Money cents={result.incomeCents} /> · contribue <Money cents={result.contributionCents} /> ({formatShare(share)} %)
          </Text>
        </Box>
      </Flex>
    </Card>
  );
}
