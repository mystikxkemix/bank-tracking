import { CaretSortIcon, CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { Badge, Button, Dialog, DropdownMenu, Flex, Text, TextField } from '@radix-ui/themes';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import type { Space } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { spaceUrl } from '../../lib/space';
import { ROLE_LABELS, useCreateSpace, useSpaces } from './api';

/** Dropdown listing the user's spaces (with their role) + "new space". `pill` is the compact trigger of the mobile header. */
export function SpaceSwitcher({ currentSpaceId, variant = 'bar' }: { currentSpaceId: string | null; variant?: 'bar' | 'pill' }) {
  const spaces = useSpaces();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<boolean>(false);
  const current: Space | undefined = spaces.data?.find((space: Space) => space.id === currentSpaceId);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            variant="surface"
            color="gray"
            radius={variant === 'pill' ? 'full' : undefined}
            aria-label={`Espace : ${current?.name ?? 'aucun'}. Changer d'espace`}
            className="space-trigger"
            data-variant={variant}
          >
            <Text truncate weight="bold" highContrast>
              {current?.name ?? 'Choisir un espace'}
            </Text>
            <CaretSortIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content style={{ minWidth: 240 }}>
          <DropdownMenu.Label>Espaces</DropdownMenu.Label>
          {spaces.data?.map((space: Space) => (
            <DropdownMenu.Item key={space.id} onSelect={() => navigate(spaceUrl(space.id))}>
              <Flex align="center" gap="2" width="100%">
                <Flex width="16px">{space.id === currentSpaceId && <CheckIcon />}</Flex>
                <Text truncate style={{ flex: 1 }}>
                  {space.name}
                </Text>
                {space.role !== 'owner' && (
                  <Badge size="1" color={space.role === 'viewer' ? 'gray' : 'blue'}>
                    {ROLE_LABELS[space.role]}
                  </Badge>
                )}
              </Flex>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => setCreating(true)}>
            <PlusIcon /> Nouvel espace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <CreateSpaceDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function CreateSpaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSpace = useCreateSpace();
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    createSpace.mutate(
      { name },
      {
        onSuccess: (space: Space) => {
          onOpenChange(false);
          setName('');
          navigate(spaceUrl(space.id));
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Nouvel espace</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Un espace regroupe des comptes, catégories, budgets et objectifs. Tu pourras le partager depuis ses réglages.
        </Dialog.Description>
        <form onSubmit={submit}>
          <Flex direction="column" gap="3" mt="4">
            <TextField.Root placeholder="Ex : Foyer" required autoFocus value={name} onChange={(event) => setName(event.target.value)} />
            <ErrorCallout error={createSpace.error} />
            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={createSpace.isPending}>
                Créer
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
