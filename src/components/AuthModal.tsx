import React, { useState } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Bot, 
  Mail, 
  Lock, 
  User, 
  Briefcase,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Business, UserRole } from '../types';
import { TenantSelectModal } from './TenantSelectModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithEmail, signUpWithEmail, switchRoleForDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [role, setRole] = useState<UserRole>('BUSINESS_ADMIN');
  const [loading, setLoading] = useState(false);
  const [showTenantPicker, setShowTenantPicker] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      await signUpWithEmail(email, password, name, role, workspaceName);
    } else {
      await loginWithEmail(email, password);
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  const handleSelectBusinessAdmin = (biz: Business) => {
    switchRoleForDemo(
      'BUSINESS_ADMIN', 
      biz.id, 
      `${biz.name} Admin`, 
      biz.supportEmail || `admin@${biz.id}.com`
    );
    setShowTenantPicker(false);
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Header */}
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg mx-auto mb-3">
              <Bot className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {isSignUp ? 'Create AgentDesk Account' : 'Sign in to AgentDesk'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Access your AI Receptionist workspace & Knowledge Base
            </p>
          </div>

          {/* Quick 2-Mode Demo Logins */}
          <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              ⚡ 1-Click Role Login
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Option 1: Platform Admin */}
              <button
                type="button"
                onClick={() => {
                  switchRoleForDemo('PLATFORM_ADMIN');
                  onSuccess();
                  onClose();
                }}
                className="p-3 bg-white hover:bg-purple-50 text-purple-700 font-semibold rounded-2xl border border-purple-200 transition-all shadow-2xs hover:shadow-xs text-left cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[12px] text-slate-900 group-hover:text-purple-700">Platform Admin</div>
                  <div className="text-[10px] text-purple-600">SaaS Owner • All Access</div>
                </div>
              </button>

              {/* Option 2: Business Admin */}
              <button
                type="button"
                onClick={() => setShowTenantPicker(true)}
                className="p-3 bg-white hover:bg-blue-50 text-slate-800 font-semibold rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs text-left cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-[12px] text-slate-900 group-hover:text-blue-600">Business Admin</div>
                  <div className="text-[10px] text-blue-600">Select Business...</div>
                </div>
              </button>
            </div>
          </div>

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business / Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Health Institute"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="BUSINESS_ADMIN">Business Owner / Client Admin (Isolated Tenant)</option>
                  <option value="SUPPORT_AGENT">Support Team Staff</option>
                  <option value="PLATFORM_ADMIN">SaaS Platform Owner (Multi-tenant)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center text-xs text-slate-500">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 font-bold hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Register Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Tenant Picker for Business Admin Login */}
      <TenantSelectModal
        isOpen={showTenantPicker}
        onClose={() => setShowTenantPicker(false)}
        onSelectBusiness={handleSelectBusinessAdmin}
      />
    </>
  );
};
