import { useState } from 'react';
import { KeyRound, User } from 'lucide-react';
import { useAuth } from '../../auth';
import { changeOwnPassword } from '../api';
import { useTranslation } from '../../../shared/i18n/translations';

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: FormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function ProfileCard() {
  const { claims, token } = useAuth();
  const t = useTranslation();
  const p = t.settings.profile;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const username = claims.sub ?? '—';
  const role = claims.role ?? '—';

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldError(null);
    setSubmitError(null);
    setSuccess(false);
  };

  const validate = (): string | null => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return p.errors.required;
    }
    if (form.newPassword.length < 8) {
      return p.errors.tooShort;
    }
    if (form.newPassword !== form.confirmPassword) {
      return p.errors.mismatch;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setSubmitError(null);

    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await changeOwnPassword(token, form.currentPassword, form.newPassword);
      setForm(EMPTY_FORM);
      setSuccess(true);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setSubmitError(p.errors.wrongCurrent);
      } else {
        setSubmitError(p.errors.generic);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-content-heading">{p.title}</h2>
      </div>

      {/* Read-only info */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-8">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-content-secondary">{p.username}</p>
            <p className="text-sm font-semibold text-content-heading">{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400 ring-1 ring-inset ring-brand-500/20"
            aria-label={p.role}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Password change form */}
      <div className="border-t border-edge pt-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-content-secondary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-content-heading">{p.changePassword}</h3>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="profile-current-password"
                className="mb-1 block text-sm font-medium text-content-secondary"
              >
                {p.currentPassword}
              </label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={handleChange('currentPassword')}
                className="w-full rounded-lg border border-edge bg-surface-hover px-3 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50 sm:max-w-sm"
              />
            </div>

            <div>
              <label
                htmlFor="profile-new-password"
                className="mb-1 block text-sm font-medium text-content-secondary"
              >
                {p.newPassword}
              </label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={handleChange('newPassword')}
                className="w-full rounded-lg border border-edge bg-surface-hover px-3 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50 sm:max-w-sm"
              />
            </div>

            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1 block text-sm font-medium text-content-secondary"
              >
                {p.confirmPassword}
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                className="w-full rounded-lg border border-edge bg-surface-hover px-3 py-2 text-sm text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50 sm:max-w-sm"
              />
            </div>
          </div>

          {fieldError && (
            <p role="alert" className="mt-3 text-sm text-red-500">
              {fieldError}
            </p>
          )}

          {submitError && (
            <p role="alert" className="mt-3 text-sm text-red-500">
              {submitError}
            </p>
          )}

          {success && (
            <p role="status" className="mt-3 text-sm text-emerald-500">
              {p.success}
            </p>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-edge bg-surface-hover px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '...' : p.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
