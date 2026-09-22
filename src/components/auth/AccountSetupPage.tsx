import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Mail,
  User,
  ShieldCheck
} from 'lucide-react';

interface AccountSetupPageProps {
  token?: string;
  onSuccess?: (businessId?: string) => void;
  onNavigateLogin?: () => void;
}

export const AccountSetupPage: React.FC<AccountSetupPageProps> = ({
  token: initialToken,
  onSuccess,
  onNavigateLogin
}) => {
  const [token, setToken] = useState(initialToken || '');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    businessName: string;
    ownerName: string;
    ownerEmail: string;
    role: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    // Extract token from prop, query parameter, or hash
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
      verifyToken(effectiveToken);
    } else {
      setVerifying(false);
      setVerificationError('No account setup token was provided in the invitation link.');
    }
  }, [initialToken]);

  const verifyToken = async (tok: string) => {
    setVerifying(true);
    setVerificationError(null);
    try {
      const res = await fetch(`/api/auth/setup-account/verify?token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (data.success && data.valid) {
        setAccountInfo({
          businessName: data.businessName,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          role: data.role
        });
      } else {
        setVerificationError(data.error || 'This setup link is invalid or has expired. Please contact your platform administrator for a new invitation.');
      }
    } catch (err: any) {
      setVerificationError('Unable to verify setup token. Please check your internet connection.');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setSetupComplete(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = data.redirectUrl || '/dashboard';
          }
        }, 1800);
      } else {
        setSubmitError(data.error || 'Failed to complete account setup.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error during setup. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AgentDesk Business Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Set Up Your Business Account
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Activate your workspace and secure your credentials
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {verifying ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-300">Verifying your invitation link...</p>
              <p className="text-xs text-slate-500">Connecting to secure authentication registry</p>
            </div>
          ) : verificationError ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Invalid or Expired Link</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {verificationError}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => onNavigateLogin ? onNavigateLogin() : (window.location.href = '/login')}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : setupComplete ? (
            <div className="space-y-5 text-center py-6">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Workspace Initialized!</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your business account is now active. Redirecting you to your AI FrontDesk dashboard...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-medium pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Launching dashboard</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSetupSubmit} className="space-y-5">
              {/* Account Overview Box */}
              {accountInfo && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" />
                      Business:
                    </span>
                    <span className="font-bold text-white">{accountInfo.businessName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      Owner:
                    </span>
                    <span className="font-medium text-slate-200">{accountInfo.ownerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      Email:
                    </span>
                    <span className="font-mono text-slate-300">{accountInfo.ownerEmail}</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Password Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password Requirements Notice */}
              <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security Requirements</span>
                </div>
                <p>• At least 8 characters</p>
                <p>• Passwords are encrypted using Scrypt with salt</p>
                <p>• Your credentials will never be emailed</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activating Account & Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Activate Account & Launch Workspace</span>
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
