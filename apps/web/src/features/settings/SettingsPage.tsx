import { Box, Tabs } from '@radix-ui/themes';
import { useSearchParams } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { useCurrentSpace } from '../../lib/space';
import { AccountsSection } from '../accounts/AccountsSection';
import { CategoriesSection } from '../categories/CategoriesSection';
import { MembersSection } from '../spaces/MembersSection';
import { SpaceSettingsSection } from '../spaces/SpaceSettingsSection';

const TABS: string[] = ['accounts', 'categories', 'members', 'space'];

/** Space settings. Each tab is owned by its feature folder; this page only lays them out. Tab in the URL (?tab=). */
export function SettingsPage() {
  const { space } = useCurrentSpace();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw: string | null = searchParams.get('tab');
  const tab: string = raw && TABS.includes(raw) ? raw : 'accounts';

  return (
    <>
      <PageHeader title="Réglages" description={space.name} />
      <Tabs.Root value={tab} onValueChange={(value: string) => setSearchParams({ tab: value }, { replace: true })}>
        <Tabs.List size={{ initial: '1', sm: '2' }} wrap="wrap">
          <Tabs.Trigger value="accounts">Comptes</Tabs.Trigger>
          <Tabs.Trigger value="categories">Catégories et règles</Tabs.Trigger>
          <Tabs.Trigger value="members">Partage</Tabs.Trigger>
          <Tabs.Trigger value="space">Espace</Tabs.Trigger>
        </Tabs.List>
        <Box pt="4">
          <Tabs.Content value="accounts">
            <AccountsSection />
          </Tabs.Content>
          <Tabs.Content value="categories">
            <CategoriesSection />
          </Tabs.Content>
          <Tabs.Content value="members">
            <MembersSection />
          </Tabs.Content>
          <Tabs.Content value="space">
            <SpaceSettingsSection />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </>
  );
}
