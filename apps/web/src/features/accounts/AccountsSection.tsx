import { Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge, Button, Card, Dialog, Flex, IconButton, Select, Skeleton, Table, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import { ACCOUNT_KINDS, type Account, type AccountKind } from '@bank/shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { Money } from '../../components/Money';
import { useCurrentSpace } from '../../lib/space';
import { ACCOUNT_KIND_LABELS, useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from './api';

/** Settings > Comptes. Reference implementation of a CRUD list (loading, empty, error, read-only states). */
export function AccountsSection() {
  const { canEdit } = useCurrentSpace();
  const accounts = useAccounts();
  const deleteAccount = useDeleteAccount();

  return (
    <Card size="2">
      <Flex justify="between" align="center" mb="3">
        <Text weight="bold">Comptes bancaires</Text>
        {canEdit && (
          <AccountDialog
            trigger={
              <Button size="2">
                <PlusIcon /> Ajouter
              </Button>
            }
          />
        )}
      </Flex>

      <ErrorCallout error={accounts.error ?? deleteAccount.error} />

      {accounts.isPending ? (
        <Flex direction="column" gap="2">
          <Skeleton height="36px" />
          <Skeleton height="36px" />
        </Flex>
      ) : accounts.data?.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Aucun compte"
          description="Ajoute le compte dont tu vas importer les relevés (compte courant, livret...)."
          action={canEdit ? <AccountDialog trigger={<Button>Ajouter un compte</Button>} /> : undefined}
        />
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Nom</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Solde importé</Table.ColumnHeaderCell>
              {canEdit && <Table.ColumnHeaderCell width="1%" />}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {accounts.data?.map((account: Account) => (
              <Table.Row key={account.id} align="center">
                <Table.RowHeaderCell>
                  <Text weight="medium">{account.name}</Text>
                  <Text as="div" size="1" color="gray">
                    {account.transactionCount} transaction{account.transactionCount > 1 ? 's' : ''}
                  </Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Badge color={account.kind === 'savings' ? 'jade' : 'gray'}>{ACCOUNT_KIND_LABELS[account.kind]}</Badge>
                </Table.Cell>
                <Table.Cell justify="end">
                  <Money cents={account.balanceCents} currency={account.currency} />
                </Table.Cell>
                {canEdit && (
                  <Table.Cell>
                    <Flex gap="1">
                      <AccountDialog
                        account={account}
                        trigger={
                          <IconButton variant="ghost" color="gray" aria-label={`Modifier ${account.name}`}>
                            <Pencil1Icon />
                          </IconButton>
                        }
                      />
                      <ConfirmDialog
                        title={`Supprimer « ${account.name} » ?`}
                        description="Seul un compte sans transaction peut être supprimé. Annule d'abord ses imports si besoin."
                        confirmLabel="Supprimer"
                        onConfirm={() => deleteAccount.mutate(account.id)}
                        trigger={
                          <IconButton variant="ghost" color="red" aria-label={`Supprimer ${account.name}`}>
                            <TrashIcon />
                          </IconButton>
                        }
                      />
                    </Flex>
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Card>
  );
}

/** Create (no `account`) or edit dialog. */
function AccountDialog({ account, trigger }: { account?: Account; trigger: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'checking');
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const mutation = account ? updateAccount : createAccount;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const onSuccess = (): void => setOpen(false);
    if (account) {
      updateAccount.mutate({ id: account.id, body: { name, kind } }, { onSuccess });
    } else {
      createAccount.mutate({ name, kind }, { onSuccess });
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) {
          setName(account?.name ?? '');
          setKind(account?.kind ?? 'checking');
          mutation.reset();
        }
      }}
    >
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>{account ? 'Modifier le compte' : 'Nouveau compte'}</Dialog.Title>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3">
            <Text as="label" size="2" weight="medium">
              Nom
              <TextField.Root mt="1" placeholder="Ex : Compte joint" required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
            </Text>
            <Text as="div" size="2" weight="medium">
              Type
              <Select.Root value={kind} onValueChange={(value: string) => setKind(value as AccountKind)}>
                <Select.Trigger mt="1" style={{ width: '100%' }} />
                <Select.Content>
                  {ACCOUNT_KINDS.map((item: AccountKind) => (
                    <Select.Item key={item} value={item}>
                      {ACCOUNT_KIND_LABELS[item]}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Text>
            <ErrorCallout error={mutation.error} />
            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={mutation.isPending}>
                {account ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
