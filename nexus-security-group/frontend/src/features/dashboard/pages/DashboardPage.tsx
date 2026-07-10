import { AutomationTriggers } from '../../automation/AutomationTriggers';
import { Dashboard } from './Dashboard';

export function DashboardPage() {
  return (
    <>
      <Dashboard />
      <AutomationTriggers />
    </>
  );
}
