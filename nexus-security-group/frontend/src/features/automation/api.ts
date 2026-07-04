import { createAuthHeaders } from '../../shared/api/authHeaders';

export async function triggerScrapeWorkflow(token: string | null) {
  const res = await fetch('/api/n8n/webhook/scrape', {
    method: 'POST',
    headers: createAuthHeaders(token),
  });

  return res.ok;
}
