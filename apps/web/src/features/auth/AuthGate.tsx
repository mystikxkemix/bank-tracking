import { Box, Button, Card, Flex, Heading, Spinner, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { AuthStatus } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { useAuthStatus, useLogin, useSetup } from './api';

/** Renders children only for a logged-in user; otherwise the first-launch setup or the login screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStatus();

  if (status.isPending) {
    return (
      <Flex height="100vh" align="center" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }
  if (status.isError) {
    return (
      <CenteredCard title="Connexion au serveur impossible">
        <ErrorCallout error={status.error} />
      </CenteredCard>
    );
  }
  const data: AuthStatus = status.data;
  if (!data.configured) {
    return <SetupScreen />;
  }
  if (!data.user) {
    return <LoginScreen />;
  }
  return <>{children}</>;
}

function CenteredCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Flex minHeight="100vh" align="center" justify="center" p="4">
      <Box width="100%" maxWidth="400px">
        <Card size="4">
          <Flex direction="column" gap="4">
            <Box>
              <Heading size="6">{title}</Heading>
              {subtitle && (
                <Text as="p" color="gray" size="2" mt="1">
                  {subtitle}
                </Text>
              )}
            </Box>
            {children}
          </Flex>
        </Card>
      </Box>
    </Flex>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Text as="label" size="2" weight="medium">
      <Flex direction="column" gap="1">
        {label}
        {children}
      </Flex>
    </Text>
  );
}

function LoginScreen() {
  const login = useLogin();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <CenteredCard title="Connexion" subtitle="Suivi de tes dépenses et de ton épargne.">
      <form onSubmit={submit}>
        <Flex direction="column" gap="3">
          <Field label="Email">
            <TextField.Root type="email" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Mot de passe">
            <TextField.Root type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {login.error && <ErrorCallout error={login.error} />}
          <Button type="submit" size="3" loading={login.isPending}>
            Se connecter
          </Button>
        </Flex>
      </form>
    </CenteredCard>
  );
}

function SetupScreen() {
  const setup = useSetup();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setup.mutate({ name, email, password });
  };

  return (
    <CenteredCard title="Bienvenue 👋" subtitle="Crée le compte administrateur. Tu pourras ensuite créer les accès des autres personnes.">
      <form onSubmit={submit}>
        <Flex direction="column" gap="3">
          <Field label="Prénom">
            <TextField.Root required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email">
            <TextField.Root type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Mot de passe (8 caractères minimum)">
            <TextField.Root type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {setup.error && <ErrorCallout error={setup.error} />}
          <Button type="submit" size="3" loading={setup.isPending}>
            Créer mon compte
          </Button>
        </Flex>
      </form>
    </CenteredCard>
  );
}
