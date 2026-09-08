export type AutomationRunMode = 'scheduled' | 'manual';

export interface AutomationStatus {
  title: string;
  description: string;
  runMode: AutomationRunMode;
  scheduleLabel: string;
  manualTriggerLabel: string;
  manualTriggerEnabled: boolean;
  webhookId: string;
}

export type TriggerState = 'idle' | 'running' | 'success' | 'error';

export interface TriggerResult {
  state: TriggerState;
  message?: string;
}
