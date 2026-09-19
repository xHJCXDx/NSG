import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Loader2 } from 'lucide-react';
import { loginWithCredentials } from './api';
import { useAuth } from './AuthContext';
import { useTranslation } from '../../shared/i18n/translations';

export function LoginView() {
  const t = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) newErrors.username = t.auth.validation.usernameRequired;
    if (!password) newErrors.password = t.auth.validation.passwordRequired;
    else if (password.length < 8) newErrors.password = t.auth.validation.passwordMinLength;
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);

    try {
      const accessToken = await loginWithCredentials(username, password);
      login(accessToken);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.auth.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-surface-primary">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="glass-card p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mb-4 border border-brand-500/30">
              <Shield className="w-8 h-8 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-content-heading tracking-tight">{t.auth.title}</h1>
            <p className="text-content-muted text-sm mt-2">{t.auth.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="login-username" className="text-sm font-medium text-content-secondary ml-1">{t.auth.usernameLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-content-muted" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors((prev) => ({ ...prev, username: undefined })); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-edge-input rounded-xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 text-content-primary placeholder-content-muted outline-none transition-all"
                  placeholder={t.auth.usernamePlaceholder}
                  required
                />
              </div>
              {fieldErrors.username && (
                <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.username}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-sm font-medium text-content-secondary ml-1">{t.auth.passwordLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-content-muted" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-input border border-edge-input rounded-xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 text-content-primary placeholder-content-muted outline-none transition-all"
                  placeholder={t.auth.passwordPlaceholder}
                  required
                />
              </div>
              {fieldErrors.password && (
                <p className="text-red-400 text-sm mt-1" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t.auth.signingIn}
                </>
              ) : (
                t.auth.signIn
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
