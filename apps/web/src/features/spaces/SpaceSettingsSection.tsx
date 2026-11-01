import { TrashIcon } from '@radix-ui/react-icons';
import { Badge, Box, Button, Card, Flex, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { useCurrentSpace } from '../../lib/space';
import { ROLE_LABELS, useDeleteSpace, useRenameSpace } from './api';

/** Settings > Espace: rename and delete (owners only). */
export function SpaceSettingsSection() {
  const { space, isOwner } = useCurrentSpace();

  if (!isOwner) {
    return (
      <Card size="2">
        <Text as="div" weight="bold" mb="1">
          {space.name}
        </Text>
        <Text as="p" size="2" color="gray">
          Ton rôle ici : <Badge color={space.role === 'viewer' ? 'gray' : 'blue'}>{ROLE_LABELS[space.role]}</Badge>. Seuls les propriétaires peuvent
          renommer ou supprimer cet espace.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <RenameCard key={space.id} />
      <DeleteCard />
    </Flex>
  );
}

function RenameCard() {
  const { space } = useCurrentSpace();
  const renameSpace = useRenameSpace(space.id);
  const [name, setName] = useState<string>(space.name);
  const unchanged: boolean = name.trim() === space.name || name.trim() === '';

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    renameSpace.mutate({ name: name.trim() });
  };

  return (
    <Card size="2">
      <form onSubmit={submit}>
        <Flex direction={{ initial: 'column', sm: 'row' }} gap="3" align={{ initial: 'stretch', sm: 'end' }}>
          <Box flexGrow="1" maxWidth={{ sm: '400px' }}>
            <FormField label="Nom de l'espace">
              <TextField.Root required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
          </Box>
          <Button type="submit" loading={renameSpace.isPending} disabled={unchanged}>
            Renommer
          </Button>
        </Flex>
        <Box mt="3">
          <ErrorCallout error={renameSpace.error} />
          {renameSpace.isSuccess && unchanged && (
            <Text size="2" color="green">
              Espace renommé.
            </Text>
          )}
        </Box>
      </form>
    </Card>
  );
}

function DeleteCard() {
  const { space } = useCurrentSpace();
  const deleteSpace = useDeleteSpace(space.id);
  const navigate = useNavigate();

  return (
    <Card size="2" style={{ boxShadow: 'inset 0 0 0 1px var(--red-a6)' }}>
      <Flex justify="between" align="center" gap="3" wrap="wrap">
        <Box maxWidth="520px">
          <Text as="div" weight="bold" color="red">
            Supprimer l'espace
          </Text>
          <Text as="p" size="2" color="gray">
            Supprime définitivement « {space.name} » et toutes ses données, pour tous ses membres. Impossible si c'est ton seul espace.
          </Text>
        </Box>
        <ConfirmDialog
          title={`Supprimer « ${space.name} » ?`}
          description={
            <>
              Toutes les données de l'espace seront supprimées définitivement : comptes, transactions, imports, catégories, règles, budgets, objectifs
              et répartitions du foyer.{' '}
              {space.memberCount > 1 ? `Ses ${space.memberCount} membres perdront l'accès.` : 'Personne d’autre n’y a accès.'} Cette action est
              irréversible.
            </>
          }
          confirmLabel="Supprimer définitivement"
          onConfirm={() => deleteSpace.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
          trigger={
            <Button color="red" variant="soft" loading={deleteSpace.isPending}>
              <TrashIcon /> Supprimer l'espace
            </Button>
          }
        />
      </Flex>
      <Box mt="3">
        <ErrorCallout error={deleteSpace.error} />
      </Box>
    </Card>
  );
}
