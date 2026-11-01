import { Theme } from '@radix-ui/themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { AuthGate } from '../features/auth/AuthGate';
import { queryClient } from '../lib/queryClient';
import { useColorScheme } from '../lib/useColorScheme';
import { AppRoutes } from './routes';

export function App() {
  const appearance: 'light' | 'dark' = useColorScheme();
  return (
    <Theme appearance={appearance} accentColor="indigo" grayColor="slate" radius="large">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </QueryClientProvider>
    </Theme>
  );
}
