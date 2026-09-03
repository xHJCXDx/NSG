import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2, Play } from 'lucide-react';
import { useAuth } from '../auth';
import { getAutomationStatus, triggerWorkflow } from './api';
import type { TriggerState } from './types';

export function AutomationTriggers() {
  const status = getAutomationStatus();
  const { token } = useAuth();
  const [triggerState, setTriggerState] = useState<TriggerState>('idle');
  const [message, setMessage] = useState<string | undefined>();

  const handleTrigger = async () => {
    setTriggerState('running');
    setMessage(undefined);

    const result = await triggerWorkflow(token);
    setTriggerState(result.state);
    setMessage(result.message);
  };

  const isRunning = triggerState === 'running';
  const buttonDisabled = !status.manualTriggerEnabled || isRunning;

  return (
    <div className="glass-card p-6 mt-8">
      <h2 className="text-xl font-bold text-white mb-2">{status.title}</h2>
      <p className="text-gray-400 text-sm mb-6">{status.description}</p>

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
          {isRunning ? 'Running scan...' : status.manualTriggerLabel}
        </button>

        <div className="flex items-center text-sky-300 bg-sky-500/10 px-4 py-2 rounded-lg border border-sky-500/20">
          <Clock className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">{status.scheduleLabel}</span>
        </div>
      </div>

      {triggerState === 'success' && message && (
        <div className="mt-4 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-500/20" role="status">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {triggerState === 'error' && message && (
        <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}
    </div>
  );
}
