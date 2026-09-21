import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../auth';
import { LanguageProvider } from '../../../shared/contexts/LanguageContext';
import { DateFormatProvider } from '../../../shared/contexts/DateFormatContext';
import { createTestQueryClient } from '../../../shared/test/createTestQueryClient';
import { KeywordsPage } from './KeywordsPage';

const encodePayload = (payload: unknown) =>
  btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const makeToken = (permissions: string[]) => `header.${encodePayload({ permissions })}.signature`;

const keyword = {
  keyword_id: 10,
  keyword_text: 'acme',
  keyword_type: 'keyword',
  keyword_category: 'brand',
  keyword_weight: 20,
  is_active: true,
  is_regex: false,
  case_sensitive: false,
  added_by: null,
  added_at: '2026-09-20T10:00:00Z',
  last_match_at: '2026-09-20T12:00:00Z',
  match_count: 3,
  false_positive_count: 0,
  true_positive_count: 0,
  trigger_immediate_alert: false,
  min_matches_for_alert: 1,
  description: null,
};

const renderKeywordsPage = (permissions = ['keywords:read', 'keywords:write', 'keywords:delete']) => {
  localStorage.setItem('nsg:auth:token', makeToken(permissions));
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LanguageProvider>
        <DateFormatProvider>
          <AuthProvider>
            <KeywordsPage />
          </AuthProvider>
        </DateFormatProvider>
      </LanguageProvider>
    </QueryClientProvider>,
  );
};

describe('KeywordsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('lists backend keywords and exposes write/delete controls when permitted', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [keyword] } as Response);

    renderKeywordsPage();

    expect(screen.getByRole('heading', { name: 'Keywords' })).toBeInTheDocument();
    expect(await screen.findByText('acme')).toBeInTheDocument();
    expect(screen.getByText('brand')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create keyword' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('hides write and delete controls for read-only keyword sessions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [keyword] } as Response);

    renderKeywordsPage(['keywords:read']);

    expect(await screen.findByText('acme')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('keywords:write');
    expect(screen.queryByRole('button', { name: 'Create keyword' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  it('creates keywords with minimal validation and sanitized optional category', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...keyword, keyword_text: 'new-acme', keyword_category: null, keyword_weight: 30 }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...keyword, keyword_text: 'new-acme', keyword_category: null, keyword_weight: 30 }] } as Response);

    renderKeywordsPage();

    await user.click(screen.getByRole('button', { name: 'Create keyword' }));
    await user.clear(screen.getByLabelText('Priority'));
    await user.type(screen.getByLabelText('Priority'), '200');
    const createButtons = screen.getAllByRole('button', { name: 'Create keyword' });
    await user.click(createButtons[createButtons.length - 1]);
    expect(screen.getByText('Keyword text is required')).toBeInTheDocument();
    expect(screen.getByText('Priority must be a whole number from 1 to 100')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Keyword text'), ' new-acme ');
    await user.clear(screen.getByLabelText('Priority'));
    await user.type(screen.getByLabelText('Priority'), '30');
    const validCreateButtons = screen.getAllByRole('button', { name: 'Create keyword' });
    await user.click(validCreateButtons[validCreateButtons.length - 1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/keywords', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ keyword_text: 'new-acme', keyword_type: 'keyword', keyword_category: undefined, keyword_weight: 30, is_active: true }),
      }));
    });
    expect(await screen.findByText('new-acme created successfully.')).toBeInTheDocument();
  });

  it('supports inline edit, active toggle, and safe delete confirmation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [keyword] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...keyword, keyword_weight: 25 }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...keyword, keyword_weight: 25 }] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...keyword, is_active: false }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ ...keyword, is_active: false }] } as Response)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);

    renderKeywordsPage();
    expect(await screen.findByText('acme')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const priorityInputs = screen.getAllByLabelText('Priority');
    const editPriority = priorityInputs[priorityInputs.length - 1];
    await user.clear(editPriority);
    await user.type(editPriority, '25');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/keywords/10', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ keyword_weight: 25 }) })));

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/keywords/10', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ is_active: false }) })));

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/keywords/10', expect.objectContaining({ method: 'DELETE' })));
  });
});
