import type { AutomationStatus } from './types';

export const AUTOMATION_STATUS: AutomationStatus = {
  title: 'Automations',
  description:
    'The OSINT workflow currently runs automatically from n8n. Manual dashboard triggering will be enabled after the workflow exposes a dedicated webhook.',
  runMode: 'scheduled',
  scheduleLabel: 'Scheduled every 15 minutes',
  manualTriggerLabel: 'Manual trigger pending',
  manualTriggerEnabled: false,
};
