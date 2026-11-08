import { ExitIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { Avatar, Badge, Box, Button, Card, Flex, Grid, IconButton, Select, Skeleton, Table, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { SPACE_ROLES, type CurrentUser, type SpaceMember, type SpaceRole } from '@bank/shared';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorCallout } from '../../components/ErrorCallout';
import { FormField } from '../../components/FormField';
import { useCurrentSpace } from '../../lib/space';
import { useAuthStatus } from '../auth/api';
import { ROLE_LABELS, useAddMember, useLeaveSpace, useMembers, useRemoveMember, useUpdateMemberRole } from './api';

const ROLE_DESCRIPTIONS: Record<SpaceRole, string> = {
  owner: 'Tout ce que permet « Gestion », plus renommer ou supprimer l’espace et gérer les membres.',
  editor: 'Voit et modifie toutes les données : comptes, imports, catégories, budgets, objectifs, répartition.',
  viewer: 'Voit toutes les données de l’espace sans pouvoir rien modifier.',
};

const ROLE_COLORS: Record<SpaceRole, 'indigo' | 'blue' | 'gray'> = { owner: 'indigo', editor: 'blue', viewer: 'gray' };

/** Settings > Partage: members and their role, add by email, remove, leave the space. */
export function MembersSection() {
  const { space, isOwner } = useCurrentSpace();
  const me: CurrentUser | null | undefined = useAuthStatus().data?.user;
  const members = useMembers(space.id);
  const updateRole = useUpdateMemberRole(space.id);
  const removeMember = useRemoveMember(space.id);
  const leaveSpace = useLeaveSpace(space.id);
  const navigate = useNavigate();
  const ownerCount: number = members.data?.filter((member: SpaceMember) => member.role === 'owner').length ?? 0;
  // The last owner cannot leave (the API answers 409): offer it only when someone else keeps the space.
  const canLeave: boolean = !isOwner || ownerCount > 1;

  return (
    <Flex direction="column" gap="4">
      <Card size="2">
        <Flex direction="column" gap="1" mb="3">
          <Text weight="bold">Membres de « {space.name} »</Text>
          <Text size="2" color="gray">
            Partager l'espace donne accès à tous ses comptes et à toutes ses données.
          </Text>
        </Flex>

        <ErrorCallout error={members.error ?? updateRole.error ?? removeMember.error} />

        {members.isPending ? (
          <Flex direction="column" gap="2">
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </Flex>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Membre</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Rôle</Table.ColumnHeaderCell>
                {isOwner && <Table.ColumnHeaderCell width="1%" />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members.data?.map((member: SpaceMember) => {
                const isMe: boolean = member.userId === me?.id;
                return (
                  <Table.Row key={member.userId} align="center">
                    <Table.RowHeaderCell>
                      <Flex align="center" gap="3" minWidth="0">
                        <Avatar size="2" radius="full" fallback={member.name.slice(0, 1).toUpperCase()} />
                        <Box minWidth="0">
                          <Text as="div" size="2" weight="medium" truncate>
                            {member.name}
                            {isMe && (
                              <Badge ml="2" size="1" color="gray">
                                Toi
                              </Badge>
                            )}
                          </Text>
                          <Text as="div" size="1" color="gray" truncate>
                            {member.email}
                          </Text>
                        </Box>
                      </Flex>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      {isOwner ? (
                        <Select.Root
                          size="1"
                          value={member.role}
                          disabled={updateRole.isPending}
                          onValueChange={(role: string) => updateRole.mutate({ userId: member.userId, role: role as SpaceRole })}
                        >
                          <Select.Trigger aria-label={`Rôle de ${member.name}`} />
                          <Select.Content>
                            {SPACE_ROLES.map((role: SpaceRole) => (
                              <Select.Item key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      ) : (
                        <Badge color={ROLE_COLORS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </Table.Cell>
                    {isOwner && (
                      <Table.Cell>
                        {!isMe && (
                          <ConfirmDialog
                            title={`Retirer ${member.name} de l'espace ?`}
                            description={`${member.name} n'aura plus accès à « ${space.name} » ni à ses données. Les données de l'espace restent intactes, tu pourras le ou la rajouter plus tard.`}
                            confirmLabel="Retirer"
                            onConfirm={() => removeMember.mutate(member.userId)}
                            trigger={
                              <IconButton variant="ghost" color="red" aria-label={`Retirer ${member.name}`}>
                                <TrashIcon />
                              </IconButton>
                            }
                          />
                        )}
                      </Table.Cell>
                    )}
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Card>

      {isOwner && <AddMemberCard spaceId={space.id} />}

      <Card size="2">
        <Text as="div" weight="bold" mb="3">
          Les rôles
        </Text>
        <Grid columns={{ initial: '1', sm: '3' }} gap="4">
          {(['viewer', 'editor', 'owner'] as SpaceRole[]).map((role: SpaceRole) => (
            <Box key={role}>
              <Badge color={ROLE_COLORS[role]} mb="1">
                {ROLE_LABELS[role]}
              </Badge>
              <Text as="p" size="2" color="gray">
                {ROLE_DESCRIPTIONS[role]}
              </Text>
            </Box>
          ))}
        </Grid>
      </Card>

      {canLeave && (
        <Card size="2">
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Box>
              <Text as="div" weight="bold">
                Quitter cet espace
              </Text>
              <Text as="div" size="2" color="gray">
                Tu n'y auras plus accès. Ses données restent pour les autres membres.
              </Text>
            </Box>
            <ConfirmDialog
              title={`Quitter « ${space.name} » ?`}
              description="Tu n'auras plus accès à cet espace ni à ses données. Pour y revenir, un propriétaire devra te rajouter."
              confirmLabel="Quitter"
              onConfirm={() => leaveSpace.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })}
              trigger={
                <Button variant="soft" color="red">
                  <ExitIcon /> Quitter l'espace
                </Button>
              }
            />
          </Flex>
          <Box mt="3">
            <ErrorCallout error={leaveSpace.error} />
          </Box>
        </Card>
      )}
    </Flex>
  );
}

function AddMemberCard({ spaceId }: { spaceId: string }) {
  const addMember = useAddMember(spaceId);
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<SpaceRole>('editor');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    addMember.mutate({ email, role }, { onSuccess: () => setEmail('') });
  };

  return (
    <Card size="2">
      <Text as="div" weight="bold">
        Ajouter un membre
      </Text>
      <Text as="div" size="2" color="gray" mb="3">
        La personne doit déjà avoir un compte sur l'app. Sinon, demande à un administrateur de le créer.
      </Text>
      <form onSubmit={submit}>
        <Flex direction={{ initial: 'column', sm: 'row' }} gap="3" align={{ initial: 'stretch', sm: 'end' }}>
          <Box flexGrow="1">
            <FormField label="Email">
              <TextField.Root type="email" required placeholder="sam@exemple.fr" value={email} onChange={(event) => setEmail(event.target.value)} />
            </FormField>
          </Box>
          <FormField label="Rôle" asLabel={false}>
            <Select.Root value={role} onValueChange={(value: string) => setRole(value as SpaceRole)}>
              <Select.Trigger aria-label="Rôle du nouveau membre" style={{ minWidth: 150 }} />
              <Select.Content>
                {SPACE_ROLES.map((item: SpaceRole) => (
                  <Select.Item key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </FormField>
          <Button type="submit" loading={addMember.isPending}>
            <PlusIcon /> Ajouter
          </Button>
        </Flex>
        <Box mt="3">
          <ErrorCallout error={addMember.error} />
        </Box>
      </form>
    </Card>
  );
}
