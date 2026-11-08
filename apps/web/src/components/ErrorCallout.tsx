import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Callout } from '@radix-ui/themes';

/** Shows an API (or any) error. ApiError messages are already French and user-facing. */
export function ErrorCallout({ error }: { error: Error | null }) {
  if (!error) {
    return null;
  }
  return (
    <Callout.Root color="red" role="alert">
      <Callout.Icon>
        <ExclamationTriangleIcon />
      </Callout.Icon>
      <Callout.Text>{error.message || 'Une erreur est survenue'}</Callout.Text>
    </Callout.Root>
  );
}
