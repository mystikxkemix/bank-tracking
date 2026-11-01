import { CheckCircledIcon, DotsHorizontalIcon, InfoCircledIcon, LockClosedIcon, PlusIcon } from '@radix-ui/react-icons';
import { AlertDialog, Avatar, Badge, Box, Button, Callout, Card, Dialog, DropdownMenu, Flex, IconButton, Skeleton, Switch, Table, Text, TextField, Tooltip } from '@radix-ui/themes';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { CurrentUser, User } from '@bank/shared';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { PageHeader } from '../../components/PageHeader';
import { formatDay } from '../../lib/format';
import { useAuthStatus } from '../auth/api';
import { useCreateUser, useDeleteUser, useResetUserPassword, useUpdateUser, useUsers } from './api';

const MIN_PASSWORD_LENGTH: number = 8;
/** No 0/O, 1/l/I: the admin reads the password out loud or writes it down. */
const PASSWORD_ALPHABET: string = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(length: number = 12): string {
  const bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(length));
  let password: string = '';
  for (const byte of bytes) {
    password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
  }
  return password;
}

type UserDialog = { kind: 'rename' | 'password' | 'delete'; user: User } | null;

/** /admin/users: logins of the app (admins only). Each person gets a personal space when created. */
export function UsersPage() {
  const me: CurrentUser | null | undefined = useAuthStatus().data?.user;

  if (!me?.isAdmin) {
    return (
      <>
        <PageHeader title="Utilisateurs" />
        <Card>
          <EmptyState
            icon={<LockClosedIcon width="32" height="32" />}
            title="Réservé aux administrateurs"
            description="Seul un administrateur peut créer ou gérer les comptes. Demande-lui si tu as besoin d'un accès pour quelqu'un."
          />
        </Card>
      </>
    );
  }
  return <UsersAdmin me={me} />;
}

function UsersAdmin({ me }: { me: CurrentUser }) {
  const users = useUsers();
  const updateUser = useUpdateUser();
  const [dialog, setDialog] = useState<UserDialog>(null);

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Il n'y a pas d'inscription : crée ici le compte de chaque personne."
        actions={
          <CreateUserDialog
            trigger={
              <Button>
                <PlusIcon /> Nouvel utilisateur
              </Button>
            }
          />
        }
      />
      <Card size="2">
        <ErrorCallout error={users.error ?? updateUser.error} />
        {users.isPending ? (
          <Flex direction="column" gap="2">
            <Skeleton height="44px" />
            <Skeleton height="44px" />
            <Skeleton height="44px" />
          </Flex>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Utilisateur</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Admin</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="1%" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.data?.map((user: User) => {
                const isMe: boolean = user.id === me.id;
                return (
                  <Table.Row key={user.id} align="center">
                    <Table.RowHeaderCell>
                      <Flex align="center" gap="3" minWidth="0">
                        <Avatar size="2" radius="full" fallback={user.name.slice(0, 1).toUpperCase()} />
                        <Box minWidth="0">
                          <Text as="div" size="2" weight="medium" truncate>
                            {user.name}
                            {isMe && (
                              <Badge ml="2" size="1" color="gray">
                                Toi
                              </Badge>
                            )}
                          </Text>
                          <Text as="div" size="1" color="gray" truncate title={`Créé le ${formatDay(user.createdAt.slice(0, 10))}`}>
                            {user.email}
                          </Text>
                        </Box>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      {isMe ? (
                        // Removing your own rights would lock you out of this page: another admin has to do it.
                        <Tooltip content="Un autre administrateur peut te retirer ce droit">
                          <Badge>Admin</Badge>
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={user.isAdmin}
                          disabled={updateUser.isPending}
                          aria-label={`${user.name} est administrateur`}
                          onCheckedChange={(isAdmin: boolean) => updateUser.mutate({ id: user.id, body: { isAdmin } })}
                        />
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                          <IconButton variant="ghost" color="gray" aria-label={`Actions pour ${user.name}`}>
                            <DotsHorizontalIcon />
                          </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Item onSelect={() => setDialog({ kind: 'rename', user })}>Modifier le nom</DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => setDialog({ kind: 'password', user })}>Réinitialiser le mot de passe</DropdownMenu.Item>
                          {!isMe && (
                            <>
                              <DropdownMenu.Separator />
                              <DropdownMenu.Item color="red" onSelect={() => setDialog({ kind: 'delete', user })}>
                                Supprimer
                              </DropdownMenu.Item>
                            </>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Card>

      {dialog?.kind === 'rename' && <RenameUserDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'password' && <ResetPasswordDialog user={dialog.user} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteUserDialog user={dialog.user} onClose={() => setDialog(null)} />}
    </>
  );
}

/** Password input with a "Générer" button (the admin hands the password over, so a random one is often easier). */
function PasswordInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Flex gap="2">
      <Box flexGrow="1">
        <TextField.Root
          type="text"
          autoComplete="off"
          spellCheck={false}
          required
          minLength={MIN_PASSWORD_LENGTH}
          className="tabular"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Box>
      <Button type="button" variant="soft" color="gray" onClick={() => onChange(generatePassword())}>
        Générer
      </Button>
    </Flex>
  );
}

function CreateUserDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content maxWidth="480px">{open && <CreateUserForm onClose={() => setOpen(false)} />}</Dialog.Content>
    </Dialog.Root>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const created: User | undefined = createUser.data;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    createUser.mutate({ email, name, password, isAdmin });
  };

  if (created) {
    return (
      <>
        <Dialog.Title>Compte créé</Dialog.Title>
        <Flex direction="column" gap="3">
          <Callout.Root color="green">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Transmets ces identifiants à {created.name}. À sa connexion, {created.name} retrouvera son espace personnel « Espace de {created.name} » et
              pourra changer son mot de passe dans « Mon profil ».
            </Callout.Text>
          </Callout.Root>
          <Card variant="surface">
            <Text as="div" size="2" color="gray">
              Email
            </Text>
            <Text as="div" weight="medium">
              {created.email}
            </Text>
            <Text as="div" size="2" color="gray" mt="2">
              Mot de passe initial
            </Text>
            <Text as="div" weight="medium" className="tabular" style={{ fontFamily: 'var(--code-font-family)' }}>
              {password}
            </Text>
          </Card>
          <Text size="2" color="gray">
            Pour partager un espace avec cette personne, ajoute-la dans Réglages, onglet Partage de l'espace.
          </Text>
          <Flex justify="end">
            <Button onClick={onClose}>Terminé</Button>
          </Flex>
        </Flex>
      </>
    );
  }

  return (
    <>
      <Dialog.Title>Nouvel utilisateur</Dialog.Title>
      <Dialog.Description size="2" color="gray" mb="4">
        Tu choisis un mot de passe initial et tu le donnes à la personne. Un espace personnel est créé pour elle automatiquement.
      </Dialog.Description>
      <form onSubmit={submit}>
        <Flex direction="column" gap="3">
          <FormField label="Prénom">
            <TextField.Root required autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Email" hint="Sert d'identifiant de connexion.">
            <TextField.Root type="email" required autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
          </FormField>
          <FormField label="Mot de passe initial" hint={`${MIN_PASSWORD_LENGTH} caractères minimum. La personne pourra le changer ensuite.`}>
            <PasswordInput value={password} onChange={setPassword} />
          </FormField>
          <Text as="label" size="2">
            <Flex gap="2" align="start">
              <Switch checked={isAdmin} onCheckedChange={setIsAdmin} mt="1" />
              <Box>
                <Text as="div" weight="medium">
                  Administrateur
                </Text>
                <Text as="div" size="1" color="gray">
                  Peut créer, modifier et supprimer les comptes des autres personnes.
                </Text>
              </Box>
            </Flex>
          </Text>
          <ErrorCallout error={createUser.error} />
          <Flex gap="3" justify="end" mt="2">
            <Button type="button" variant="soft" color="gray" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={createUser.isPending} disabled={password.length < MIN_PASSWORD_LENGTH}>
              Créer le compte
            </Button>
          </Flex>
        </Flex>
      </form>
    </>
  );
}

function RenameUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const [name, setName] = useState<string>(user.name);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    updateUser.mutate({ id: user.id, body: { name: name.trim() } }, { onSuccess: onClose });
  };

  return (
    <Dialog.Root open onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Modifier le nom</Dialog.Title>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3">
            <FormField label="Prénom">
              <TextField.Root required autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <ErrorCallout error={updateUser.error} />
            <Flex gap="3" justify="end" mt="2">
              <Button type="button" variant="soft" color="gray" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={updateUser.isPending} disabled={name.trim() === '' || name.trim() === user.name}>
                Enregistrer
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const resetPassword = useResetUserPassword();
  const [password, setPassword] = useState<string>('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    resetPassword.mutate({ id: user.id, body: { password } });
  };

  return (
    <Dialog.Root open onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Réinitialiser le mot de passe</Dialog.Title>
        {resetPassword.isSuccess ? (
          <Flex direction="column" gap="3">
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Nouveau mot de passe de {user.name} : <strong style={{ fontFamily: 'var(--code-font-family)' }}>{password}</strong>. Toutes ses sessions ouvertes ont été
                fermées.
              </Callout.Text>
            </Callout.Root>
            <Flex justify="end">
              <Button onClick={onClose}>Terminé</Button>
            </Flex>
          </Flex>
        ) : (
          <>
            <Dialog.Description size="2" color="gray" mb="4">
              Choisis un nouveau mot de passe pour {user.name} ({user.email}) et transmets-le lui. Toutes ses sessions seront déconnectées.
            </Dialog.Description>
            <form onSubmit={submit}>
              <Flex direction="column" gap="3">
                <FormField label="Nouveau mot de passe" hint={`${MIN_PASSWORD_LENGTH} caractères minimum.`}>
                  <PasswordInput value={password} onChange={setPassword} />
                </FormField>
                <ErrorCallout error={resetPassword.error} />
                <Flex gap="3" justify="end" mt="2">
                  <Button type="button" variant="soft" color="gray" onClick={onClose}>
                    Annuler
                  </Button>
                  <Button type="submit" loading={resetPassword.isPending} disabled={password.length < MIN_PASSWORD_LENGTH}>
                    Réinitialiser
                  </Button>
                </Flex>
              </Flex>
            </form>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** Controlled (opened from a menu item), so not the trigger-based ConfirmDialog; same content rules. */
function DeleteUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const deleteUser = useDeleteUser();
  return (
    <AlertDialog.Root open onOpenChange={(open: boolean) => !open && onClose()}>
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>Supprimer le compte de {user.name} ?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {user.name} ne pourra plus se connecter. Ses espaces personnels (ceux dont il ou elle est seul membre) seront supprimés avec toutes leurs
          données : comptes, transactions, budgets, objectifs... Dans les espaces partagés, seul son accès disparaît. Cette action est irréversible.
        </AlertDialog.Description>
        <Callout.Root color="gray" size="1" mt="3">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Si {user.name} est le seul propriétaire d'un espace partagé, donne d'abord ce rôle à quelqu'un d'autre.</Callout.Text>
        </Callout.Root>
        <Box mt="3">
          <ErrorCallout error={deleteUser.error} />
        </Box>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Annuler
            </Button>
          </AlertDialog.Cancel>
          {/* Not an AlertDialog.Action: it would close the dialog before a 409 (sole owner) could be shown. */}
          <Button color="red" loading={deleteUser.isPending} onClick={() => deleteUser.mutate(user.id, { onSuccess: onClose })}>
            Supprimer définitivement
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
