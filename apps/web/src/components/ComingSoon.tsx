import { Card } from '@radix-ui/themes';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';

/** Temporary placeholder for pages not built yet. Delete once every feature page exists. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon="🚧" title="Bientôt disponible" description="Cette page est en cours de construction." />
      </Card>
    </>
  );
}
