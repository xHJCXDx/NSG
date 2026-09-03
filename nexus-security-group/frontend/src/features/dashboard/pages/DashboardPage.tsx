import { AutomationTriggers } from '../../automation';
import { Dashboard } from './Dashboard';

export function DashboardPage() {
  return (
    <>
      <Dashboard />
      <AutomationTriggers />
    </>
  );
}
