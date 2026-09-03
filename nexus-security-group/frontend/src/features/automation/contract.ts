import type { AutomationStatus } from './types';

export const AUTOMATION_ENDPOINT = '/api/n8n/webhook';

export const AUTOMATION_STATUS: AutomationStatus = {
  title: 'Automations',
  description:
    'The OSINT workflow runs on a 15-minute schedule. You can also trigger a full scan manually from this panel.',
  runMode: 'manual',
  scheduleLabel: 'Scheduled every 15 minutes',
  manualTriggerLabel: 'Run OSINT scan',
  manualTriggerEnabled: true,
  webhookId: 'osint-trigger',
};

export const AUTOMATION_COPY = {
  running: 'Running scan...',
  success: 'OSINT scan completed successfully.',
  error: {
    unauthenticated: 'Sign in before triggering a scan.',
    fallback: 'Scan failed. The workflow may be unreachable.',
  },
} as const;
