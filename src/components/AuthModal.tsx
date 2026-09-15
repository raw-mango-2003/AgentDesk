import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Bot, 
  Mail, 
  Lock, 
  User, 
  AlertCircle,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (view?: string) => void;
  onNavigateGetStarted?: () => void;
  onNavigatePlatformLogin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  onNavigateGetStarted,
  onNavigatePlatformLogin 
}) => {
  const { loginBusiness, signupBusiness } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      const res = await signupBusiness(name, email, password, confirmPassword);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
        return;
      }
      if (res.requiresEmailVerification) {
        setVerificationSent(true);
        return;
      }
      onSuccess('onboarding');
      onClose();
    } else {
      const res = await loginBusiness(email, password);
      setLoading(false);
      if (!res.success) {
        if (res.requiresEmailVerification) {
          setError('Email verification required. Please click the verification link sent to your inbox before signing in.');
        } else {
          setError(res.error || 'Invalid email or password.');
        }
        return;
      }
      if (res.onboardingPending) {
        onSuccess('onboarding');
      } else {
        onSuccess('dashboard');
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg mx-auto mb-3">
            <Bot className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {verificationSent ? 'Verify Your Email' : (isSignUp ? 'Create AgentDesk Account' : 'Sign in to AgentDesk')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {verificationSent 
              ? 'Complete email verification to activate your workspace' 
              : 'Access your AI Receptionist workspace & business console'}
          </p>
        </div>

        {verificationSent ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-blue-400">
                Verification link dispatched to:
              </p>
              <p className="text-white font-mono text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                {email}
              </p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Please check your inbox (and spam folder) and click the confirmation link to activate your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerificationSent(false);
                setIsSignUp(false);
                setPassword('');
                setConfirmPassword('');
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                <span>{isSignUp ? 'Create Business Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center text-xs text-slate-400">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>{' '}
          <button
            onClick={() => {
              if (!isSignUp && onNavigateGetStarted) {
                onClose();
                onNavigateGetStarted();
              } else {
                setIsSignUp(!isSignUp);
                setError(null);
              }
            }}
            className="text-blue-400 font-bold hover:underline cursor-pointer ml-1"
          >
            {isSignUp ? 'Sign In' : 'Get Started'}
          </button>
        </div>

        {/* Platform Admin note */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigatePlatformLogin) onNavigatePlatformLogin();
            }}
            className="text-[11px] text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
          >
            Platform Administrator? Sign in here →
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
