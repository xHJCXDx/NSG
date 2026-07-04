import { AutomationTriggers } from '../../automation/AutomationTriggers';
import { MetricsDashboard } from '../../metrics/MetricsDashboard';

export function DashboardPage() {
  return (
    <>
      <MetricsDashboard />
      <AutomationTriggers />
    </>
  );
}
