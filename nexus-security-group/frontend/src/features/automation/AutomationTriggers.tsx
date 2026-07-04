import { Clock, Play } from 'lucide-react';

export function AutomationTriggers() {
  return (
    <div className="glass-card p-6 mt-8">
      <h2 className="text-xl font-bold text-white mb-2">Automations</h2>
      <p className="text-gray-400 text-sm mb-6">
        The OSINT workflow currently runs automatically every 15 minutes from n8n.
        Manual dashboard triggering will be enabled after the workflow exposes a dedicated webhook.
      </p>

      <div className="flex items-center space-x-4">
        <button
          type="button"
          disabled
          className="px-5 py-3 bg-brand-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center opacity-50 cursor-not-allowed"
        >
          <Play className="w-5 h-5 mr-2" />
          Manual trigger pending
        </button>

        <div className="flex items-center text-sky-300 bg-sky-500/10 px-4 py-2 rounded-lg border border-sky-500/20">
          <Clock className="w-5 h-5 mr-2" />
          <span className="text-sm font-medium">Scheduled every 15 minutes</span>
        </div>
      </div>
    </div>
  );
}
