import { AUTOMATION_STATUS } from './contract';
import type { AutomationStatus } from './types';

export function getAutomationStatus(): AutomationStatus {
  return AUTOMATION_STATUS;
}
