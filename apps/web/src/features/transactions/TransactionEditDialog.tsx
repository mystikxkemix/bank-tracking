import { Button, Code, Dialog, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import type { Transaction } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { useUpdateTransaction } from './api';

/** Controlled dialog to rename a transaction and add a note. The bank label stays visible (rules use it). */
export function TransactionEditDialog({ transaction, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const [label, setLabel] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [editedId, setEditedId] = useState<string | null>(null);
  const update = useUpdateTransaction();

  // Load the form when another transaction is opened (render-time sync, no effect).
  if (transaction && transaction.id !== editedId) {
    setEditedId(transaction.id);
    setLabel(transaction.label);
    setNote(transaction.note ?? '');
    update.reset();
  }

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!transaction) {
      return;
    }
    update.mutate(
      { id: transaction.id, body: { label: label.trim(), note: note.trim() || null } },
      {
        onSuccess: () => {
          setEditedId(null);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog.Root
      open={transaction !== null}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setEditedId(null);
          onClose();
        }
      }}
    >
      <Dialog.Content maxWidth="460px">
        <Dialog.Title>Modifier la transaction</Dialog.Title>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3">
            <Text as="div" size="2" color="gray">
              Libellé de la banque : <Code variant="ghost">{transaction?.rawLabel}</Code>
            </Text>
            <Text as="label" size="2" weight="medium">
              Libellé affiché
              <TextField.Root mt="1" required maxLength={200} autoFocus value={label} onChange={(event) => setLabel(event.target.value)} />
            </Text>
            <Text as="label" size="2" weight="medium">
              Note
              <TextArea mt="1" maxLength={500} placeholder="Ex : remboursé par Julie" value={note} onChange={(event) => setNote(event.target.value)} />
            </Text>
            <ErrorCallout error={update.error} />
            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={update.isPending} disabled={!label.trim()}>
                Enregistrer
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
