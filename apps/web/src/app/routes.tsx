import { Navigate, Route, Routes } from 'react-router';
import { BudgetsPage } from '../features/budgets/BudgetsPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GoalsPage } from '../features/goals/GoalsPage';
import { ImportPage } from '../features/import/ImportPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { RedirectToDefaultSpace, SpaceRoute } from '../features/spaces/SpaceRoute';
import { SplitPage } from '../features/split/SplitPage';
import { ReviewPage } from '../features/transactions/ReviewPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { UsersPage } from '../features/users/UsersPage';
import { AppLayout } from './AppLayout';

/** URL map. Space pages live under /s/:spaceId so the current space is explicit and survives reloads. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RedirectToDefaultSpace />} />
      <Route path="/s/:spaceId" element={<SpaceRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
