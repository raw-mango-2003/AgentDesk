import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw,
  MailCheck,
  ShieldCheck
} from 'lucide-react';

interface EmailVerificationPageProps {
  token?: string;
  onSuccess?: () => void;
  onNavigateLogin?: () => void;
}

export const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({
  token: initialToken,
  onSuccess,
  onNavigateLogin
}) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      verifyEmail(effectiveToken);
    } else {
      setLoading(false);
      setErrorMessage('Missing email verification token.');
    }
  }, [initialToken]);

  const verifyEmail = async (tokenStr: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenStr })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setErrorMessage(data.error || 'Verification link is invalid or has expired.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to verify email address. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <MailCheck className="w-3.5 h-3.5" />
            <span>Official Email Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Account Email Verification
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          {loading ? (
            <div className="py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-300">Verifying your email address...</p>
              <p className="text-xs text-slate-500">Confirming SHA-256 token in secure registry</p>
            </div>
          ) : success ? (
            <div className="space-y-5 py-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Email Address Confirmed!</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Your email has been verified. You can now access all AgentDesk features and notifications.
                </p>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => onSuccess ? onSuccess() : (onNavigateLogin ? onNavigateLogin() : (window.location.href = '/login'))}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Verification Failed</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => onNavigateLogin ? onNavigateLogin() : (window.location.href = '/login')}
                  className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
