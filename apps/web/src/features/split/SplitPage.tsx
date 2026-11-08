import { CheckIcon, CopyIcon, ExclamationTriangleIcon, InfoCircledIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { AlertDialog, Box, Button, Callout, Card, Flex, Grid, Heading, IconButton, Skeleton, Text, TextArea, TextField } from '@radix-ui/themes';
import { useMemo, useState, type ReactNode } from 'react';
import type { SplitMonth, SplitResult } from '@bank/shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { MonthHeader } from '../../components/MonthHeader';
import { formatMonth } from '../../lib/format';
import { useCurrentSpace } from '../../lib/space';
import { useMonthParam } from '../../lib/useMonthParam';
import { useDeleteSplitMonth, useSaveSplitMonth, useSplitMonth } from './api';
import { PersonsCard } from './PersonsCard';
import { draftResult, equalShares, formatShare, newLineId, toDraft, toPlanBody, validateDraft, type SplitDraft } from './splitDraft';
import { SplitHistoryCard } from './SplitHistoryCard';
import { SplitPlanTable } from './SplitPlanTable';
import { SplitResultCards } from './SplitResultCards';

const savedAtFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

interface DraftState {
  /** Identifies the server version the draft was built from: a new version (save, other month) resets the draft. */
  sourceKey: string | null;
  draft: SplitDraft | null;
  /** Turned on by a save attempt with problems: highlights the empty fields. */
  showErrors: boolean;
}

function sourceKeyOf(data: SplitMonth | undefined): string | null {
  return data ? `${data.month}|${data.saved}|${data.updatedAt ?? ''}|${data.copiedFrom ?? ''}` : null;
}

/** "Répartition du foyer": result cards first, then the editable plan, live recomputed with computeSplit. */
export function SplitPage() {
  const { canEdit } = useCurrentSpace();
  const [month, setMonth] = useMonthParam();
  const splitMonth = useSplitMonth(month);
  const saveMonth = useSaveSplitMonth(month);
  const deleteMonth = useDeleteSplitMonth(month);
  const data: SplitMonth | undefined = splitMonth.data;
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);

  // The draft follows the server data until the user edits it; resynced during render (no effect, see AI_MEMORY).
  const sourceKey: string | null = sourceKeyOf(data);
  const [state, setState] = useState<DraftState>({ sourceKey: null, draft: null, showErrors: false });
  if (state.sourceKey !== sourceKey) {
    setState({ sourceKey, draft: data ? toDraft(data.plan) : null, showErrors: false });
  }
  const draft: SplitDraft | null = state.sourceKey === sourceKey ? state.draft : data ? toDraft(data.plan) : null;

  const originalJson: string | null = useMemo(() => (data ? JSON.stringify(toDraft(data.plan)) : null), [data]);
  const dirty: boolean = draft !== null && originalJson !== null && JSON.stringify(draft) !== originalJson;
  const result: SplitResult | null = useMemo(() => (draft ? draftResult(draft) : null), [draft]);
  const issues: string[] = draft && state.showErrors ? validateDraft(draft) : [];

  const editDraft = (next: SplitDraft): void => setState({ ...state, draft: next });
  const resetDraft = (): void => setState({ sourceKey, draft: data ? toDraft(data.plan) : null, showErrors: false });

  const requestMonth = (next: string): void => {
    if (dirty) {
      setPendingMonth(next);
    } else {
      setMonth(next);
    }
  };

  const save = (): void => {
    if (!draft) {
      return;
    }
    if (validateDraft(draft).length > 0) {
      setState({ ...state, showErrors: true });
      return;
    }
    saveMonth.mutate(toPlanBody(draft));
  };

  const header: ReactNode = (
    <MonthHeader
      title="Répartition du foyer"
      description="Ce qui reste sur le compte commun et ce que chacun récupère, mois par mois."
      month={month}
      onChange={requestMonth}
    />
  );

  let body: ReactNode;
  if (splitMonth.isPending) {
    body = (
      <Flex direction="column" gap="4">
        <Grid columns={{ initial: '1', sm: '3' }} gap="4">
          <Skeleton height="150px" />
          <Skeleton height="150px" />
          <Skeleton height="150px" />
        </Grid>
        <Skeleton height="360px" />
      </Flex>
    );
  } else if (splitMonth.isError || !data || !draft || !result) {
    body = <ErrorCallout error={splitMonth.error ?? new Error('Répartition introuvable')} />;
  } else if (draft.persons.length === 0) {
    body = canEdit ? (
      <SplitOnboarding onStart={editDraft} draft={draft} />
    ) : (
      <Card>
        <EmptyState
          icon="🏡"
          title={`Pas de répartition pour ${formatMonth(month)}`}
          description="Les personnes qui gèrent cet espace n'ont pas encore préparé la répartition du foyer."
        />
      </Card>
    );
  } else {
    const readOnly: boolean = !canEdit;
    body = (
      <Flex direction="column" gap="4">
        <StatusBar
          data={data}
          canEdit={canEdit}
          dirty={dirty}
          saving={saveMonth.isPending}
          onSave={save}
          onReset={resetDraft}
          onDelete={() => deleteMonth.mutate()}
          issues={issues}
        />
        <ErrorCallout error={saveMonth.error ?? deleteMonth.error} />
        <SplitResultCards result={result} persons={draft.persons} />

        <Grid columns={{ initial: '1', md: draft.note || !readOnly ? '3fr 2fr' : '1' }} gap="4" align="start">
          <PersonsCard draft={draft} readOnly={readOnly} showErrors={state.showErrors} onChange={editDraft} />
          {(draft.note || !readOnly) && (
            <Card size="2">
              <Text as="label" weight="bold" htmlFor="split-note">
                Note du mois
              </Text>
              <Text as="div" size="1" color="gray" mb="2">
                Ce qui change ce mois-ci (prime, congé, dépense exceptionnelle...).
              </Text>
              {readOnly ? (
                <Text size="2">{draft.note}</Text>
              ) : (
                <TextArea id="split-note" maxLength={500} rows={3} value={draft.note} onChange={(event) => editDraft({ ...draft, note: event.target.value })} />
              )}
            </Card>
          )}
        </Grid>

        <SplitPlanTable draft={draft} result={result} readOnly={readOnly} showErrors={state.showErrors} onChange={editDraft} />
      </Flex>
    );
  }

  return (
    <>
      {header}
      <Flex direction="column" gap="5">
        {body}
        <SplitHistoryCard currentMonth={month} onSelect={requestMonth} />
      </Flex>

      <AlertDialog.Root open={pendingMonth !== null} onOpenChange={(open: boolean) => !open && setPendingMonth(null)}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>Modifications non enregistrées</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Si tu changes de mois maintenant, tes modifications de {formatMonth(month)} seront perdues.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Rester
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                onClick={() => {
                  if (pendingMonth) {
                    setMonth(pendingMonth);
                  }
                  setPendingMonth(null);
                }}
              >
                Changer de mois
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
}

interface StatusBarProps {
  data: SplitMonth;
  canEdit: boolean;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onDelete: () => void;
  /** Validation problems of the last save attempt, shown in the sticky area so they stay visible while fixing them. */
  issues: string[];
}

/** "octobre 2026" -> "Octobre 2026" at the start of a sentence. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Where the month stands (draft copied, unsaved edits, saved) and the save action. Sticky while there is something to save. */
function StatusBar({ data, canEdit, dirty, saving, onSave, onReset, onDelete, issues }: StatusBarProps) {
  const copiedLabel: string | null = data.copiedFrom ? formatMonth(data.copiedFrom) : null;

  if (!canEdit) {
    if (data.saved) {
      return null;
    }
    return (
      <Callout.Root color="gray" size="1">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          {capitalize(formatMonth(data.month))} n'est pas encore enregistré{copiedLabel ? ` : aperçu calculé depuis ${copiedLabel}` : ''}.
        </Callout.Text>
      </Callout.Root>
    );
  }

  const needsSave: boolean = dirty || !data.saved;
  let icon: ReactNode = <CheckIcon />;
  // undefined = accent color.
  let color: 'amber' | 'gray' | undefined = 'gray';
  let message: ReactNode;
  if (dirty) {
    icon = <InfoCircledIcon />;
    color = 'amber';
    message = data.saved
      ? 'Modifications non enregistrées, le résultat est recalculé en direct.'
      : `${capitalize(formatMonth(data.month))} n'est pas encore enregistré, le résultat est recalculé en direct.`;
  } else if (!data.saved) {
    icon = <CopyIcon />;
    color = undefined;
    message = copiedLabel ? `Pré-rempli depuis ${copiedLabel}, vérifie et enregistre.` : `${capitalize(formatMonth(data.month))} n'est pas encore enregistré.`;
  } else {
    message = data.updatedAt ? `Enregistré le ${savedAtFormatter.format(new Date(data.updatedAt))}.` : 'Enregistré.';
  }

  return (
    <Box position={needsSave ? 'sticky' : 'static'} top="0" style={{ zIndex: 2, background: 'var(--app-background, var(--color-background))' }} py={needsSave ? '2' : '0'}>
      <Callout.Root color={color} size="1">
        <Callout.Icon>{icon}</Callout.Icon>
        <Flex asChild justify="between" align="center" gap="3" wrap="wrap" width="100%">
          <Callout.Text>
            <span>{message}</span>
            {/* A span, not a div: Callout.Text is a <p>. */}
            <Flex asChild gap="2" align="center">
              <span>
                {dirty && (
                  <Button size="2" variant="soft" color="gray" onClick={onReset}>
                    Annuler les modifications
                  </Button>
                )}
                {needsSave && (
                  <Button size="2" onClick={onSave} loading={saving}>
                    <CheckIcon /> Enregistrer
                  </Button>
                )}
                {!needsSave && data.saved && (
                  <ConfirmDialog
                    title={`Supprimer la répartition de ${formatMonth(data.month)} ?`}
                    description="Le plan enregistré pour ce mois sera supprimé. Le mois redeviendra un brouillon pré-rempli depuis le dernier mois enregistré avant lui."
                    confirmLabel="Supprimer"
                    onConfirm={onDelete}
                    trigger={
                      <Button size="1" variant="ghost" color="red">
                        <TrashIcon /> Supprimer ce mois
                      </Button>
                    }
                  />
                )}
              </span>
            </Flex>
          </Callout.Text>
        </Flex>
      </Callout.Root>
      {issues.length > 0 && (
        <Callout.Root color="red" role="alert" size="1" mt="2">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            Avant d'enregistrer :
            {issues.map((issue: string) => (
              <Text as="span" key={issue} style={{ display: 'block' }}>
                • {issue}
              </Text>
            ))}
          </Callout.Text>
        </Callout.Root>
      )}
    </Box>
  );
}

/** Empty plan: explain the idea in 3 steps and ask who is in the household (shares split equally, editable after). */
function SplitOnboarding({ draft, onStart }: { draft: SplitDraft; onStart: (draft: SplitDraft) => void }) {
  const [names, setNames] = useState<string[]>(['', '']);
  const ready: boolean = names.every((name: string) => name.trim() !== '');

  const start = (): void => {
    const shares: number[] = equalShares(names.length);
    onStart({
      ...draft,
      persons: names.map((name: string, index: number) => ({ id: newLineId(), name: name.trim(), shareText: formatShare(shares[index] ?? 0) })),
    });
  };

  return (
    <Card size="3">
      <Flex direction="column" gap="4" maxWidth="560px">
        <Box>
          <Heading size="5">Prépare la répartition du foyer</Heading>
          <Text as="p" size="2" color="gray" mt="1">
            Les salaires arrivent sur le compte commun. Tu indiques les charges et l'épargne communes, l'app calcule ce qui reste sur le
            commun et ce que chacun récupère sur son compte perso.
          </Text>
        </Box>
        <Flex direction="column" gap="1">
          <Text size="2">1. Les personnes du foyer et leur part (50 / 50 par défaut).</Text>
          <Text size="2">2. Les revenus de chacun, puis les charges et l'épargne communes.</Text>
          <Text size="2">3. Enregistre : le mois suivant sera pré-rempli, tu n'auras qu'à ajuster.</Text>
        </Flex>
        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Qui participe ?
          </Text>
          {names.map((name: string, index: number) => (
            <Flex key={index} gap="2" align="center">
              <Box flexGrow="1">
                <TextField.Root
                  aria-label={`Prénom de la personne ${index + 1}`}
                  placeholder={index === 0 ? 'Ex : Mike' : 'Ex : Julie'}
                  maxLength={60}
                  autoFocus={index === 0}
                  value={name}
                  onChange={(event) => setNames(names.map((item: string, position: number) => (position === index ? event.target.value : item)))}
                />
              </Box>
              <IconButton
                variant="ghost"
                color="gray"
                aria-label={`Retirer la personne ${index + 1}`}
                disabled={names.length <= 1}
                onClick={() => setNames(names.filter((_item: string, position: number) => position !== index))}
              >
                <TrashIcon />
              </IconButton>
            </Flex>
          ))}
          <Flex gap="3" justify="between" align="center" wrap="wrap" mt="1">
            <Button size="1" variant="ghost" onClick={() => setNames([...names, ''])} disabled={names.length >= 10}>
              <PlusIcon /> Ajouter une personne
            </Button>
            <Button onClick={start} disabled={!ready}>
              Commencer
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
