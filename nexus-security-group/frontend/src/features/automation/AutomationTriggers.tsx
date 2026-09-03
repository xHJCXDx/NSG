import { Clock, Play } from 'lucide-react';
import { getAutomationStatus } from './api';

export function AutomationTriggers() {
  const status = getAutomationStatus();

  return (
    <div className="glass-card p-6 mt-8">
      <h2 className="text-xl font-bold text-white mb-2">{status.title}</h2>
      <p className="text-gray-400 text-sm mb-6">{status.description}</p>

      <div className="flex items-center space-x-4">
        <button
          type="button"
          disabled={!status.manualTriggerEnabled}
          className="px-5 py-3 bg-brand-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center opacity-50 cursor-not-allowed"
        >
          <Play className="w-5 h-5 mr-2" />
          {status.manualTriggerLabel}
        </button>

        <div className="flex items-center text-sky-300 bg-sky-500/10 px-4 py-2 rounded-lg border border-sky-500/20">
          <Clock className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">{status.scheduleLabel}</span>
        </div>
      </div>
    </div>
  );
}
