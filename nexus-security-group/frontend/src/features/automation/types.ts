export type AutomationRunMode = 'scheduled' | 'manual_pending';

export interface AutomationStatus {
  title: string;
  description: string;
  runMode: AutomationRunMode;
  scheduleLabel: string;
  manualTriggerLabel: string;
  manualTriggerEnabled: boolean;
}
