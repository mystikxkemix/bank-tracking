import { CheckIcon, ExclamationTriangleIcon, FileTextIcon, InfoCircledIcon, ResetIcon, UploadIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Callout, Card, Flex, Heading, Select, Separator, Skeleton, Spinner, Text } from '@radix-ui/themes';
import { useRef, useState, type DragEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import type { Account, CsvMapping, ImportPreview, ImportRecord } from '@bank/shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { PageHeader } from '../../components/PageHeader';
import { spaceUrl, useCurrentSpace } from '../../lib/space';
import { useAccounts } from '../accounts/api';
import { readStatementFile, useCommitImport, useImportPreview, useImports, useUndoImport } from './api';
import { CsvMappingStep } from './CsvMappingStep';
import { draftFromMapping, mappingFromDraft, type MappingDraft } from './mappingDraft';
import { SampleTable } from './SampleTable';

type Step = 'file' | 'mapping' | 'preview';

/** Same limit as the API (10 MB of text). */
const MAX_FILE_BYTES: number = 10_000_000;
const MAPPING_DEBOUNCE_MS: number = 400;

const dateTimeFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/** Import wizard (Fichier, Correspondance for CSV, Aperçu), then the review queue. History with undo below. */
export function ImportPage() {
  const { space, canEdit } = useCurrentSpace();

  if (!canEdit) {
    return (
      <>
        <PageHeader title="Importer un relevé" />
        <Card>
          <EmptyState
            icon="🔒"
            title="L'import est réservé aux éditeurs"
            description="Tu consultes cet espace en lecture seule. Demande à un éditeur ou au propriétaire d'importer les relevés."
            action={
              <Button variant="soft" asChild>
                <RouterLink to={spaceUrl(space.id)}>Retour au tableau de bord</RouterLink>
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Importer un relevé" description="Exporte un relevé CSV ou OFX depuis le site de ta banque, puis dépose-le ici." />
      <Flex direction="column" gap="5">
        <ImportWizard />
        <ImportHistory />
      </Flex>
    </>
  );
}

interface LoadedFile {
  name: string;
  content: string;
}

function ImportWizard() {
  const { space } = useCurrentSpace();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const previewMutation = useImportPreview();
  const commit = useCommitImport();

  const [step, setStep] = useState<Step>('file');
  const [chosenAccountId, setChosenAccountId] = useState<string | null>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [draft, setDraft] = useState<MappingDraft | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mappingTimer = useRef<number | undefined>(undefined);
  const requestId = useRef<number>(0);

  const accountList: Account[] = accounts.data ?? [];
  const accountId: string | null = chosenAccountId ?? accountList[0]?.id ?? null;
  const account: Account | undefined = accountList.find((item: Account) => item.id === accountId);
  const isCsv: boolean = preview?.format === 'csv';
  const mapping: CsvMapping | null = draft ? mappingFromDraft(draft) : null;
  const importCount: number = preview ? (preview.format === 'csv' ? preview.validCount : preview.totalCount) : 0;

  const reset = (): void => {
    window.clearTimeout(mappingTimer.current);
    requestId.current += 1;
    setStep('file');
    setFile(null);
    setPreview(null);
    setDraft(null);
    setFileError(null);
    setRefreshing(false);
    previewMutation.reset();
    commit.reset();
  };

  const loadFile = async (picked: File): Promise<void> => {
    if (!accountId) {
      return;
    }
    setFileError(null);
    if (picked.size > MAX_FILE_BYTES) {
      setFileError('Fichier trop volumineux (10 Mo maximum).');
      return;
    }
    const content: string = await readStatementFile(picked);
    if (!content.trim()) {
      setFileError('Ce fichier est vide.');
      return;
    }
    const loaded: LoadedFile = { name: picked.name, content };
    requestId.current += 1;
    previewMutation.mutate(
      { accountId, fileName: loaded.name, content },
      {
        onSuccess: (result: ImportPreview) => {
          setFile(loaded);
          setPreview(result);
          if (result.format === 'csv') {
            setDraft(draftFromMapping(result.suggestedMapping));
            // A mapping that already reads the file (saved profile or good detection): straight to the preview.
            setStep(result.suggestedMapping && result.validCount > 0 ? 'preview' : 'mapping');
          } else {
            setDraft(null);
            setStep('preview');
          }
        },
      },
    );
  };

  /** Mapping edits re-run the server parser, debounced. Out-of-order answers are dropped. */
  const changeDraft = (next: MappingDraft): void => {
    setDraft(next);
    window.clearTimeout(mappingTimer.current);
    const nextMapping: CsvMapping | null = mappingFromDraft(next);
    if (!nextMapping || !file || !accountId) {
      return;
    }
    setRefreshing(true);
    mappingTimer.current = window.setTimeout(() => {
      requestId.current += 1;
      const current: number = requestId.current;
      previewMutation.mutate(
        { accountId, fileName: file.name, content: file.content, mapping: nextMapping },
        {
          onSuccess: (result: ImportPreview) => {
            if (current === requestId.current) {
              setPreview(result);
              setRefreshing(false);
            }
          },
          onError: () => {
            if (current === requestId.current) {
              setRefreshing(false);
            }
          },
        },
      );
    }, MAPPING_DEBOUNCE_MS);
  };

  const submit = (): void => {
    if (!file || !accountId) {
      return;
    }
    commit.mutate(
      { accountId, fileName: file.name, content: file.content, mapping: isCsv ? (mapping ?? undefined) : undefined },
      { onSuccess: (record: ImportRecord) => navigate(`${spaceUrl(space.id, '/review')}?importId=${record.id}`) },
    );
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const dropped: File | undefined = event.dataTransfer.files[0];
    if (dropped) {
      void loadFile(dropped);
    }
  };

  if (accounts.isPending) {
    return <Skeleton height="240px" />;
  }
  if (accountList.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="🏦"
          title="Ajoute d'abord un compte"
          description="Chaque relevé est rattaché à un compte bancaire (compte courant, livret...)."
          action={
            <Button asChild>
              <RouterLink to={`${spaceUrl(space.id, '/settings')}?tab=accounts`}>Ajouter un compte</RouterLink>
            </Button>
          }
        />
      </Card>
    );
  }

  // Three steps until we know the file is OFX (no column mapping needed then).
  const steps: { key: Step; label: string }[] = preview?.format !== 'ofx'
    ? [
        { key: 'file', label: 'Fichier' },
        { key: 'mapping', label: 'Correspondance' },
        { key: 'preview', label: 'Aperçu' },
      ]
    : [
        { key: 'file', label: 'Fichier' },
        { key: 'preview', label: 'Aperçu' },
      ];

  return (
    <Card size={{ initial: '2', sm: '3' }}>
      <Stepper steps={steps} current={step} onSelect={(target: Step) => (target === 'file' ? reset() : setStep(target))} canSelect={(target: Step) => target === 'file' || (preview !== null && target !== step)} />
      <Separator size="4" my="4" />

      {step === 'file' && (
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1" maxWidth="360px">
            <Text size="2" weight="medium" id="import-account">
              Compte
            </Text>
            <Select.Root value={accountId ?? undefined} onValueChange={setChosenAccountId}>
              <Select.Trigger aria-labelledby="import-account" />
              <Select.Content>
                {accountList.map((item: Account) => (
                  <Select.Item key={item.id} value={item.id}>
                    {item.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex
            direction="column"
            align="center"
            justify="center"
            gap="2"
            p="6"
            onDragOver={(event: DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent-9)' : 'var(--gray-a6)'}`,
              borderRadius: 'var(--radius-4)',
              background: dragging ? 'var(--accent-a2)' : 'var(--gray-a2)',
              textAlign: 'center',
              minHeight: 200,
            }}
          >
            {previewMutation.isPending ? (
              <>
                <Spinner size="3" />
                <Text size="2" color="gray">
                  Lecture du fichier…
                </Text>
              </>
            ) : (
              <>
                <Text size="7" color="gray">
                  <UploadIcon width="32" height="32" />
                </Text>
                <Text size="3" weight="medium">
                  Dépose ton relevé ici
                </Text>
                <Text size="2" color="gray">
                  CSV ou OFX, 10 Mo maximum. Les transactions déjà importées seront ignorées.
                </Text>
                <Button mt="2" onClick={() => inputRef.current?.click()}>
                  Choisir un fichier
                </Button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.ofx,.qfx,.txt,text/csv"
              hidden
              onChange={(event) => {
                const picked: File | undefined = event.target.files?.[0];
                event.target.value = '';
                if (picked) {
                  void loadFile(picked);
                }
              }}
            />
          </Flex>
          {fileError && <ErrorCallout error={new Error(fileError)} />}
          <ErrorCallout error={previewMutation.error} />
        </Flex>
      )}

      {step === 'mapping' && preview?.format === 'csv' && draft && (
        <Flex direction="column" gap="4">
          <FileSummary file={file} account={account} onChange={reset} />
          <CsvMappingStep preview={preview} draft={draft} onChange={changeDraft} refreshing={refreshing} />
          <ErrorCallout error={previewMutation.error} />
          <Flex justify="end" gap="3">
            <Button variant="soft" color="gray" onClick={reset}>
              Changer de fichier
            </Button>
            <Button disabled={!mapping || refreshing || preview.validCount === 0} onClick={() => setStep('preview')}>
              Continuer
            </Button>
          </Flex>
        </Flex>
      )}

      {step === 'preview' && preview && (
        <Flex direction="column" gap="4">
          <FileSummary file={file} account={account} onChange={reset} />
          <Box>
            <Heading size="5">
              {importCount} transaction{importCount > 1 ? 's' : ''} à importer
            </Heading>
            <Text size="2" color="gray">
              dans {account?.name}. Les transactions déjà présentes seront détectées et ignorées.
            </Text>
          </Box>
          {preview.format === 'csv' && preview.skippedCount > 0 && (
            <Callout.Root color="orange">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {preview.skippedCount} ligne{preview.skippedCount > 1 ? 's' : ''} ignorée{preview.skippedCount > 1 ? 's' : ''} (date ou montant illisible).{' '}
                Si ce nombre te semble élevé, vérifie la correspondance des colonnes.
              </Callout.Text>
            </Callout.Root>
          )}
          {importCount === 0 && (
            <Callout.Root color="amber">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>Aucune transaction lisible dans ce fichier.</Callout.Text>
            </Callout.Root>
          )}
          <Box>
            <Text as="div" size="2" weight="bold" mb="2">
              Premières lignes
            </Text>
            <SampleTable rows={preview.sample.slice(0, 10)} />
          </Box>
          <ErrorCallout error={commit.error} />
          <Flex justify="end" gap="3" wrap="wrap">
            {isCsv && (
              <Button variant="soft" color="gray" onClick={() => setStep('mapping')}>
                Modifier la correspondance
              </Button>
            )}
            <Button size="3" onClick={submit} loading={commit.isPending} disabled={importCount === 0}>
              <UploadIcon /> Importer {importCount} transaction{importCount > 1 ? 's' : ''}
            </Button>
          </Flex>
        </Flex>
      )}
    </Card>
  );
}

function Stepper({ steps, current, onSelect, canSelect }: { steps: { key: Step; label: string }[]; current: Step; onSelect: (step: Step) => void; canSelect: (step: Step) => boolean }) {
  const currentIndex: number = steps.findIndex((item: { key: Step }) => item.key === current);
  return (
    <Flex asChild gap={{ initial: '3', sm: '5' }} align="center" wrap="wrap">
      <ol aria-label="Étapes de l'import" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {steps.map((item: { key: Step; label: string }, index: number) => {
          const done: boolean = index < currentIndex;
          const active: boolean = index === currentIndex;
          const clickable: boolean = canSelect(item.key);
          return (
            <li key={item.key} aria-current={active ? 'step' : undefined}>
              <Flex
                asChild
                align="center"
                gap="2"
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: clickable ? 'pointer' : 'default' }}
              >
                <button type="button" disabled={!clickable} onClick={() => onSelect(item.key)}>
                  <Badge size="2" radius="full" variant={active ? 'solid' : 'soft'} color={done || active ? undefined : 'gray'} style={{ width: 26, height: 26, justifyContent: 'center' }}>
                    {done ? <CheckIcon /> : index + 1}
                  </Badge>
                  <Text size="2" weight={active ? 'bold' : 'regular'} color={active ? undefined : 'gray'}>
                    {item.label}
                  </Text>
                </button>
              </Flex>
            </li>
          );
        })}
      </ol>
    </Flex>
  );
}

function FileSummary({ file, account, onChange }: { file: LoadedFile | null; account: Account | undefined; onChange: () => void }) {
  return (
    <Flex align="center" gap="3" p="2" style={{ background: 'var(--gray-a2)', borderRadius: 'var(--radius-3)' }}>
      <FileTextIcon />
      <Text size="2" truncate style={{ flexGrow: 1 }}>
        <strong>{file?.name}</strong> → {account?.name}
      </Text>
      <Button variant="ghost" size="1" onClick={onChange}>
        Changer
      </Button>
    </Flex>
  );
}

function ImportHistory() {
  const { space } = useCurrentSpace();
  const imports = useImports();
  const accounts: Account[] = useAccounts().data ?? [];
  const undo = useUndoImport();

  return (
    <Card size="2">
      <Text as="div" weight="bold" mb="3">
        Historique des imports
      </Text>
      <ErrorCallout error={imports.error ?? undo.error} />
      {imports.isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="48px" />
          <Skeleton height="48px" />
        </Flex>
      ) : imports.data?.length === 0 ? (
        <Text as="p" size="2" color="gray">
          Aucun import pour l'instant.
        </Text>
      ) : (
        <Flex direction="column">
          {imports.data?.map((record: ImportRecord, index: number) => (
            <Flex
              key={record.id}
              gap="3"
              py="3"
              align={{ initial: 'start', sm: 'center' }}
              direction={{ initial: 'column', sm: 'row' }}
              style={{ borderTop: index === 0 ? undefined : '1px solid var(--gray-a4)' }}
            >
              <Box flexGrow="1" minWidth="0">
                <Text as="div" size="2" weight="medium" truncate>
                  {record.fileName}
                </Text>
                <Text as="div" size="1" color="gray">
                  {dateTimeFormatter.format(new Date(record.createdAt))} · {accounts.find((item: Account) => item.id === record.accountId)?.name ?? 'Compte supprimé'}
                </Text>
                <Flex gap="1" mt="1" wrap="wrap">
                  <Badge color="green" size="1">
                    {record.insertedCount} ajoutée{record.insertedCount > 1 ? 's' : ''}
                  </Badge>
                  {record.duplicateCount > 0 && (
                    <Badge color="gray" size="1">
                      {record.duplicateCount} doublon{record.duplicateCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {record.skippedCount > 0 && (
                    <Badge color="orange" size="1">
                      {record.skippedCount} illisible{record.skippedCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Badge size="1">
                    {record.categorizedCount} classée{record.categorizedCount > 1 ? 's' : ''} par règle
                  </Badge>
                </Flex>
              </Box>
              <Flex gap="2" flexShrink="0">
                <Button variant="soft" size="1" asChild>
                  <RouterLink to={`${spaceUrl(space.id, '/review')}?importId=${record.id}`}>Revoir</RouterLink>
                </Button>
                <ConfirmDialog
                  title="Annuler cet import ?"
                  description={`Les ${record.insertedCount} transactions ajoutées par « ${record.fileName} » seront supprimées, y compris leurs catégories. Tu pourras réimporter le fichier.`}
                  confirmLabel="Annuler l'import"
                  cancelLabel="Garder l'import"
                  onConfirm={() => undo.mutate(record.id)}
                  trigger={
                    <Button variant="soft" color="red" size="1">
                      <ResetIcon /> Annuler l'import
                    </Button>
                  }
                />
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
    </Card>
  );
}
