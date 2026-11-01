import { CheckCircledIcon } from '@radix-ui/react-icons';
import { Avatar, Badge, Box, Button, Callout, Card, Flex, Skeleton, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import type { CurrentUser } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStatus, useChangePassword } from '../auth/api';

const MIN_PASSWORD_LENGTH: number = 8;

/** "Mon profil": who is logged in and the password change form. Name and email are managed by an admin. */
export function ProfilePage() {
  const user: CurrentUser | null | undefined = useAuthStatus().data?.user;

  return (
    <>
      <PageHeader title="Mon profil" />
      <Flex direction="column" gap="4" maxWidth="560px">
        <Card size="3">
          {user ? (
            <Flex align="center" gap="4">
              <Avatar size="5" radius="full" fallback={user.name.slice(0, 1).toUpperCase()} />
              <Box minWidth="0">
                <Flex align="center" gap="2" wrap="wrap">
                  <Text size="5" weight="bold">
                    {user.name}
                  </Text>
                  {user.isAdmin && <Badge color="indigo">Administrateur</Badge>}
                </Flex>
                <Text as="div" size="2" color="gray" truncate>
                  {user.email}
                </Text>
                <Text as="div" size="1" color="gray" mt="1">
                  Pour changer ton nom, demande à un administrateur.
                </Text>
              </Box>
            </Flex>
          ) : (
            <Skeleton height="64px" />
          )}
        </Card>
        <PasswordCard />
      </Flex>
    </>
  );
}

function PasswordCard() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmation, setConfirmation] = useState<string>('');
  const tooShort: boolean = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;
  const mismatch: boolean = confirmation.length > 0 && confirmation !== newPassword;
  const valid: boolean = currentPassword.length > 0 && newPassword.length >= MIN_PASSWORD_LENGTH && confirmation === newPassword;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!valid) {
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmation('');
        },
      },
    );
  };

  return (
    <Card size="3">
      <Text as="div" weight="bold" mb="3">
        Changer de mot de passe
      </Text>
      <form onSubmit={submit}>
        <Flex direction="column" gap="3">
          <FormField label="Mot de passe actuel">
            <TextField.Root
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                changePassword.reset();
              }}
            />
          </FormField>
          <FormField label="Nouveau mot de passe" hint={tooShort ? undefined : `${MIN_PASSWORD_LENGTH} caractères minimum.`}>
            <TextField.Root
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              color={tooShort ? 'red' : undefined}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {tooShort && (
              <Text size="1" color="red" weight="regular">
                Encore {MIN_PASSWORD_LENGTH - newPassword.length} caractère{MIN_PASSWORD_LENGTH - newPassword.length > 1 ? 's' : ''}.
              </Text>
            )}
          </FormField>
          <FormField label="Confirme le nouveau mot de passe">
            <TextField.Root
              type="password"
              autoComplete="new-password"
              required
              color={mismatch ? 'red' : undefined}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {mismatch && (
              <Text size="1" color="red" weight="regular">
                Les deux mots de passe ne sont pas identiques.
              </Text>
            )}
          </FormField>
          <ErrorCallout error={changePassword.error} />
          {changePassword.isSuccess && (
            <Callout.Root color="green" size="1">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>Mot de passe modifié. Tes autres sessions (autres appareils) ont été déconnectées.</Callout.Text>
            </Callout.Root>
          )}
          <Flex justify="end">
            <Button type="submit" loading={changePassword.isPending} disabled={!valid}>
              Changer le mot de passe
            </Button>
          </Flex>
        </Flex>
      </form>
    </Card>
  );
}
