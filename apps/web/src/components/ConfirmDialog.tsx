import { AlertDialog, Button, Flex } from '@radix-ui/themes';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  /** Element that opens the dialog (usually a Button or a menu item). */
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Label of the button that closes without acting. Override when "Annuler" would be ambiguous (e.g. "Annuler l'import"). */
  cancelLabel?: string;
  onConfirm: () => void;
  /** Destructive actions are red (default). */
  color?: 'red' | 'teal';
}

/** Mandatory before any destructive or irreversible action (delete, undo import, leave space). */
export function ConfirmDialog({ trigger, title, description, confirmLabel, cancelLabel = 'Annuler', onConfirm, color = 'red' }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">{description}</AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {cancelLabel}
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color={color} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
