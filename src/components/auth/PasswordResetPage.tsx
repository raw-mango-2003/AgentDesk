import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

interface PasswordResetPageProps {
  token?: string;
  onSuccess?: () => void;
  onNavigateLogin?: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  token: initialToken,
  onSuccess,
  onNavigateLogin
}) => {
  const [token, setToken] = useState(initialToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    let effectiveToken = initialToken;
    if (!effectiveToken && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      effectiveToken = params.get('token') || '';
      if (!effectiveToken && window.location.hash.includes('token=')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        effectiveToken = hashParams.get('token') || '';
      }
    }
    if (effectiveToken) {
      setToken(effectiveToken);
    }
  }, [initialToken]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!token) {
      setSubmitError('Missing password reset token.');
      return;
    }

    if (newPassword.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      // The auth router is mounted at /api/auth, so password reset must use
      // the canonical endpoint. /api/reset-password is not a registered route.
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();

      if (data.success) {
        setResetComplete(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else if (onNavigateLogin) {
            onNavigateLogin();
          } else {
            window.location.href = '/login';
          }
        }, 2000);
      } else {
        // API errors may be objects such as { code, message }. Always reduce
        // them to a string before rendering so React never receives an object
        // as a child and throws minified error #31.
        const errorMessage =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
              data.message ||
              'Password reset failed. The link may have expired or already been used.';
        setSubmitError(String(errorMessage));
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Secure Password Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reset Your Password
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Create a new password for your AgentDesk account
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {resetComplete ? (
            <div className="space-y-5 text-center py-6">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Password Updated!</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your password has been changed successfully. Existing sessions have been invalidated for security.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting to sign in...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              {submitError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security Enforcement</span>
                </div>
                <p>• Single-use token invalidated immediately upon use</p>
                <p>• Prior sessions terminated across all devices</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
