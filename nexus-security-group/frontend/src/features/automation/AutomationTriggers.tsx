import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AlertTriangle, CheckCircle, Loader2, Play } from 'lucide-react';
import { triggerScrapeWorkflow } from './api';

export function AutomationTriggers() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const triggerScrape = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const triggered = await triggerScrapeWorkflow(token);

      if (triggered) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 mt-8">
      <h2 className="text-xl font-bold text-white mb-2">Automations</h2>
      <p className="text-gray-400 text-sm mb-6">Manually trigger n8n workflows directly from the dashboard.</p>

      <div className="flex items-center space-x-4">
        <button
          onClick={triggerScrape}
          disabled={loading}
          className="px-5 py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          )}
          Trigger Scraper Workflow
        </button>

        {status === 'success' && (
          <div className="flex items-center text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 animate-fade-in">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Workflow triggered successfully</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 animate-fade-in">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Failed to trigger workflow</span>
          </div>
        )}
      </div>
    </div>
  );
}
