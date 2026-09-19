import { AlertTriangle, CheckCircle, Clock, Loader2, Play } from 'lucide-react';
import { useAuth } from '../auth';
import { getAutomationStatus } from './api';
import { useTriggerWorkflow } from './hooks/useTriggerWorkflow';
import { useTranslation } from '../../shared/i18n/translations';

export function AutomationTriggers() {
  const t = useTranslation();
  const { hasPermission } = useAuth();
  const status = getAutomationStatus();
  const trigger = useTriggerWorkflow();
  const canExecuteWorkflow = hasPermission('workflows', 'execute');

  const handleTrigger = () => { trigger.mutate(); };

  const isRunning = trigger.isPending;
  const result = trigger.data;
  const buttonDisabled = !status.manualTriggerEnabled || !canExecuteWorkflow || isRunning;

  return (
    <div className="glass-card p-6 mt-8">
      <h2 className="text-xl font-bold text-content-heading mb-2">{t.automation.title}</h2>
      <p className="text-content-secondary text-sm mb-6">{t.automation.description}</p>

      <div className="flex items-center space-x-4">
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={handleTrigger}
          className={`px-5 py-3 bg-brand-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center ${
            buttonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-600'
          }`}
        >
          {isRunning ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {isRunning ? t.automation.runningScan : t.automation.manualTriggerLabel}
        </button>

        <div className="flex items-center text-sky-300 bg-sky-500/10 px-4 py-2 rounded-lg border border-sky-500/20">
          <Clock className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">{t.automation.scheduleLabel}</span>
        </div>
      </div>

      {!canExecuteWorkflow && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-200" role="note">
          {t.automation.permissionNote}
        </p>
      )}

      {result?.state === 'success' && result.message && (
        <div className="mt-4 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-500/20" role="status">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{result.message}</span>
        </div>
      )}

      {result?.state === 'error' && result.message && (
        <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{result.message}</span>
        </div>
      )}
    </div>
  );
}
