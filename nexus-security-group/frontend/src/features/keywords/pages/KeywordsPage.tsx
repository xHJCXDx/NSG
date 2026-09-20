import { Fragment, useState, type FormEvent } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../shared/i18n/translations';
import { useAuth } from '../../auth';
import { CreateKeywordError, DeleteKeywordError, UpdateKeywordError } from '../api';
import { KEYWORD_DEFAULT_PRIORITY, KEYWORD_PRIORITY_MAX, KEYWORD_PRIORITY_MIN } from '../contract';
import { useCreateKeywordMutation } from '../hooks/useCreateKeywordMutation';
import { useDeleteKeywordMutation } from '../hooks/useDeleteKeywordMutation';
import { useKeywordsQuery } from '../hooks/useKeywordsQuery';
import { useUpdateKeywordMutation } from '../hooks/useUpdateKeywordMutation';
import type { KeywordCreatePayload, KeywordResponse, KeywordUpdatePayload } from '../types';

interface KeywordFormState {
  keywordText: string;
  category: string;
  priority: string;
  isActive: boolean;
}

const initialFormState: KeywordFormState = {
  keywordText: '',
  category: '',
  priority: String(KEYWORD_DEFAULT_PRIORITY),
  isActive: true,
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildPayload = (form: KeywordFormState): KeywordCreatePayload => ({
  keyword_text: form.keywordText.trim(),
  keyword_type: 'keyword',
  keyword_category: normalizeOptional(form.category),
  keyword_weight: Number(form.priority),
  is_active: form.isActive,
});

export function KeywordsPage() {
  const t = useTranslation();
  const { hasPermission } = useAuth();
  const { data: keywords = [], isLoading, error: listError } = useKeywordsQuery();
  const createMutation = useCreateKeywordMutation();
  const updateMutation = useUpdateKeywordMutation();
  const deleteMutation = useDeleteKeywordMutation();

  const canWrite = hasPermission('keywords', 'write');
  const canDelete = hasPermission('keywords', 'delete');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<KeywordFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<KeywordFormState>(initialFormState);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const validate = (target: KeywordFormState) => {
    const errors: Record<string, string> = {};
    const priority = Number(target.priority);
    if (!target.keywordText.trim()) errors.keywordText = t.keywords.validation.textRequired;
    if (!Number.isInteger(priority) || priority < KEYWORD_PRIORITY_MIN || priority > KEYWORD_PRIORITY_MAX) {
      errors.priority = t.keywords.validation.priorityRange;
    }
    return errors;
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setStatusMessage(null);
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const keyword = await createMutation.mutateAsync(buildPayload(form));
      setStatusMessage(t.keywords.status.created(keyword.keyword_text));
      setForm(initialFormState);
      setCreateOpen(false);
    } catch (caughtError) {
      setFormError(caughtError instanceof CreateKeywordError ? caughtError.message : t.keywords.errors.createFallback);
    }
  };

  const startEditing = (keyword: KeywordResponse) => {
    setCreateOpen(false);
    setEditingId(keyword.keyword_id);
    setEditForm({
      keywordText: keyword.keyword_text,
      category: keyword.keyword_category ?? '',
      priority: String(keyword.keyword_weight ?? KEYWORD_DEFAULT_PRIORITY),
      isActive: keyword.is_active,
    });
    setEditErrors({});
    setEditError(null);
    setDeleteConfirmId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditErrors({});
    setEditError(null);
  };

  const getEditPayload = (keyword: KeywordResponse): KeywordUpdatePayload => {
    const payload: KeywordUpdatePayload = {};
    const trimmedText = editForm.keywordText.trim();
    const category = normalizeOptional(editForm.category);
    const priority = Number(editForm.priority);
    if (trimmedText !== keyword.keyword_text) payload.keyword_text = trimmedText;
    if ((category ?? null) !== (keyword.keyword_category ?? null)) payload.keyword_category = category;
    if (priority !== (keyword.keyword_weight ?? KEYWORD_DEFAULT_PRIORITY)) payload.keyword_weight = priority;
    if (editForm.isActive !== keyword.is_active) payload.is_active = editForm.isActive;
    return payload;
  };

  const handleSaveEdit = async (keyword: KeywordResponse) => {
    setEditError(null);
    setStatusMessage(null);
    const errors = validate(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const payload = getEditPayload(keyword);
    if (Object.keys(payload).length === 0) {
      setEditError(t.keywords.validation.noChanges);
      return;
    }

    try {
      const updated = await updateMutation.mutateAsync({ keywordId: keyword.keyword_id, payload });
      setStatusMessage(t.keywords.status.updated(updated.keyword_text));
      cancelEditing();
    } catch (caughtError) {
      setEditError(caughtError instanceof UpdateKeywordError ? caughtError.message : t.keywords.errors.updateFallback);
    }
  };

  const handleToggleActive = async (keyword: KeywordResponse) => {
    setStatusMessage(null);
    setEditError(null);
    try {
      const updated = await updateMutation.mutateAsync({
        keywordId: keyword.keyword_id,
        payload: { is_active: !keyword.is_active },
      });
      setStatusMessage(t.keywords.status.updated(updated.keyword_text));
    } catch (caughtError) {
      setEditError(caughtError instanceof UpdateKeywordError ? caughtError.message : t.keywords.errors.updateFallback);
    }
  };

  const handleDelete = async (keyword: KeywordResponse) => {
    setDeleteError(null);
    setStatusMessage(null);
    try {
      await deleteMutation.mutateAsync(keyword.keyword_id);
      setStatusMessage(t.keywords.status.deleted(keyword.keyword_text));
      setDeleteConfirmId(null);
    } catch (caughtError) {
      setDeleteError(caughtError instanceof DeleteKeywordError ? caughtError.message : t.keywords.errors.deleteFallback);
    }
  };

  const listErrorMessage = listError ? (listError instanceof Error ? listError.message : t.keywords.errors.listFallback) : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-400">{t.keywords.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-content-heading">{t.keywords.title}</h1>
        <p className="mt-2 max-w-3xl text-content-secondary">{t.keywords.description}</p>
      </div>

      {!canWrite && !canDelete && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-100" role="note">
          {t.keywords.authNotice.readOnly}
        </div>
      )}

      {statusMessage && (
        <div className="glass-card border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-400" role="status">
          {statusMessage}
        </div>
      )}

      <section className="glass-card overflow-hidden p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
              <KeyRound aria-hidden="true" className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content-heading">{t.keywords.list.title}</h2>
              <p className="text-sm text-content-secondary">{t.keywords.list.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <span className="text-sm text-content-muted animate-pulse">{t.keywords.loading}</span>}
            {canWrite && (
              <button
                type="button"
                onClick={() => { cancelEditing(); setCreateOpen((prev) => !prev); }}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t.keywords.form.createButton}
              </button>
            )}
          </div>
        </div>

        {listErrorMessage && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">
            {listErrorMessage}
          </div>
        )}

        {createOpen && (
          <form className="mt-5 rounded-xl border border-edge-card bg-surface-secondary p-5 space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-secondary" htmlFor="keyword-text">
                  {t.keywords.form.textLabel}
                </label>
                <input
                  id="keyword-text"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={form.keywordText}
                  onChange={(event) => { setForm((prev) => ({ ...prev, keywordText: event.target.value })); setFieldErrors((prev) => { const { keywordText: _, ...rest } = prev; return rest; }); }}
                />
                {fieldErrors.keywordText && <p className="mt-1 text-xs text-red-400" role="alert">{fieldErrors.keywordText}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary" htmlFor="keyword-category">
                  {t.keywords.form.categoryLabel}
                </label>
                <input
                  id="keyword-category"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary" htmlFor="keyword-priority">
                  {t.keywords.form.priorityLabel}
                </label>
                <input
                  id="keyword-priority"
                  type="number"
                  className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-4 py-2.5 text-content-primary outline-none transition focus:border-brand-500"
                  value={form.priority}
                  onChange={(event) => { setForm((prev) => ({ ...prev, priority: event.target.value })); setFieldErrors((prev) => { const { priority: _, ...rest } = prev; return rest; }); }}
                />
                {fieldErrors.priority && <p className="mt-1 text-xs text-red-400" role="alert">{fieldErrors.priority}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-3 text-sm text-content-secondary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  className="h-4 w-4 rounded border-edge bg-surface-input text-brand-500"
                />
                {t.keywords.form.activeLabel}
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-edge px-4 py-2.5 text-sm font-medium text-content-secondary transition hover:bg-surface-hover">
                  {t.keywords.form.cancelLabel}
                </button>
                <button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {createMutation.isPending ? t.keywords.form.creatingLabel : t.keywords.form.createButton}
                </button>
              </div>
            </div>
            {formError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{formError}</div>}
          </form>
        )}

        {!isLoading && !listErrorMessage && keywords.length === 0 && (
          <p className="mt-4 text-sm text-content-secondary">{t.keywords.list.empty}</p>
        )}

        {keywords.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-content-muted">
                  <th className="py-3 pr-4 font-medium">{t.keywords.list.columns.keyword}</th>
                  <th className="px-4 py-3 font-medium">{t.keywords.list.columns.category}</th>
                  <th className="px-4 py-3 font-medium">{t.keywords.list.columns.priority}</th>
                  <th className="px-4 py-3 font-medium">{t.keywords.list.columns.status}</th>
                  <th className="px-4 py-3 font-medium">{t.keywords.list.columns.matches}</th>
                  <th className="px-4 py-3 font-medium">{t.keywords.list.columns.lastMatch}</th>
                  {(canWrite || canDelete) && <th className="pl-4 py-3 font-medium">{t.keywords.list.columns.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-card">
                {keywords.map((keyword) => {
                  const isEditing = editingId === keyword.keyword_id;
                  const isBusy = updateMutation.isPending || deleteMutation.isPending;
                  return (
                    <Fragment key={keyword.keyword_id}>
                      <tr className="transition-colors hover:bg-surface-hover">
                        <td className="py-3.5 pr-4 font-medium text-content-heading">{keyword.keyword_text}</td>
                        <td className="px-4 py-3.5 text-content-secondary">{keyword.keyword_category ?? '—'}</td>
                        <td className="px-4 py-3.5 text-content-secondary">{keyword.keyword_weight ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-full ${keyword.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            <span className={keyword.is_active ? 'text-emerald-400' : 'text-red-400'}>
                              {keyword.is_active ? t.keywords.list.active : t.keywords.list.inactive}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-content-secondary">{keyword.match_count ?? 0}</td>
                        <td className="px-4 py-3.5 text-content-muted">{formatDateTime(keyword.last_match_at)}</td>
                        {(canWrite || canDelete) && (
                          <td className="pl-4 py-3.5">
                            <div className="flex flex-wrap gap-2">
                              {canWrite && (
                                <>
                                  <button type="button" onClick={() => startEditing(keyword)} disabled={isBusy} className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">
                                    {t.keywords.actions.edit}
                                  </button>
                                  <button type="button" onClick={() => handleToggleActive(keyword)} disabled={isBusy} className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">
                                    {keyword.is_active ? t.keywords.actions.deactivate : t.keywords.actions.activate}
                                  </button>
                                </>
                              )}
                              {canDelete && (
                                <button type="button" onClick={() => { setDeleteConfirmId(keyword.keyword_id); setDeleteError(null); }} disabled={isBusy} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
                                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                                  {t.keywords.actions.delete}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>

                      {isEditing && canWrite && (
                        <tr className="bg-surface-secondary/60">
                          <td colSpan={7} className="p-4">
                            <div className="rounded-xl border border-edge-card bg-surface-secondary p-4">
                              <h3 className="text-sm font-semibold text-content-heading">{t.keywords.edit.title(keyword.keyword_text)}</h3>
                              <div className="mt-4 grid gap-4 md:grid-cols-4 md:items-end">
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-medium text-content-secondary" htmlFor={`edit-keyword-${keyword.keyword_id}`}>{t.keywords.form.textLabel}</label>
                                  <input id={`edit-keyword-${keyword.keyword_id}`} className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={editForm.keywordText} onChange={(event) => setEditForm((prev) => ({ ...prev, keywordText: event.target.value }))} disabled={updateMutation.isPending} />
                                  {editErrors.keywordText && <p className="mt-1 text-xs text-red-400" role="alert">{editErrors.keywordText}</p>}
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-content-secondary" htmlFor={`edit-category-${keyword.keyword_id}`}>{t.keywords.form.categoryLabel}</label>
                                  <input id={`edit-category-${keyword.keyword_id}`} className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={editForm.category} onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))} disabled={updateMutation.isPending} />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-content-secondary" htmlFor={`edit-priority-${keyword.keyword_id}`}>{t.keywords.form.priorityLabel}</label>
                                  <input id={`edit-priority-${keyword.keyword_id}`} type="number" className="mt-1.5 w-full rounded-xl border border-edge-input bg-surface-input px-3 py-2 text-content-primary outline-none transition focus:border-brand-500" value={editForm.priority} onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))} disabled={updateMutation.isPending} />
                                  {editErrors.priority && <p className="mt-1 text-xs text-red-400" role="alert">{editErrors.priority}</p>}
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-3 text-sm text-content-secondary">
                                  <input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))} disabled={updateMutation.isPending} className="h-4 w-4 rounded border-edge bg-surface-input text-brand-500" />
                                  {t.keywords.form.activeLabel}
                                </label>
                                <div className="flex gap-2">
                                  <button type="button" onClick={cancelEditing} disabled={updateMutation.isPending} className="rounded-xl border border-edge px-4 py-2 text-sm font-medium text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50">{t.keywords.form.cancelLabel}</button>
                                  <button type="button" onClick={() => handleSaveEdit(keyword)} disabled={updateMutation.isPending} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">{updateMutation.isPending ? t.keywords.edit.saving : t.keywords.edit.save}</button>
                                </div>
                              </div>
                              {editError && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{editError}</div>}
                            </div>
                          </td>
                        </tr>
                      )}

                      {deleteConfirmId === keyword.keyword_id && canDelete && (
                        <tr className="bg-red-500/5">
                          <td colSpan={7} className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-content-secondary">
                              <span>{t.keywords.deleteConfirm.message(keyword.keyword_text)}</span>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => setDeleteConfirmId(null)} className="rounded-xl border border-edge px-3 py-1.5 text-xs font-medium text-content-secondary transition hover:bg-surface-hover">{t.keywords.deleteConfirm.cancel}</button>
                                <button type="button" onClick={() => handleDelete(keyword)} disabled={deleteMutation.isPending} className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">{deleteMutation.isPending ? t.keywords.deleteConfirm.deleting : t.keywords.deleteConfirm.confirm}</button>
                              </div>
                            </div>
                            {deleteError && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{deleteError}</div>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
