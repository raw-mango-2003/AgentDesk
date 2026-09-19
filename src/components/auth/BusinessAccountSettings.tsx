import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../../lib/apiClient';
import { 
  KeyRound, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  RefreshCw,
  Building2,
  Smartphone,
  Shield,
  Download,
  Trash2,
  Bell,
  Check,
  X,
  Clock,
  Layers,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Business } from '../../types';

interface BusinessAccountSettingsProps {
  business?: Business | null;
}

interface ActiveSessionItem {
  id: string;
  createdAt: number;
  expiresAt: number;
  isCurrent: boolean;
}

export const BusinessAccountSettings: React.FC<BusinessAccountSettingsProps> = ({ business }) => {
  const { currentUser, updateProfile, updatePassword, logout } = useAuth();

  // Profile form state
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorPhone, setTwoFactorPhone] = useState('');
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [setupPhoneInput, setSetupPhoneInput] = useState('+15551234567');
  const [setupChallengeId, setSetupChallengeId] = useState<string | null>(null);
  const [setupOtpCode, setSetupOtpCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);

  // Disable 2FA modal
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disablePasswordInput, setDisablePasswordInput] = useState('');

  // Active sessions state
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // Export Data state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Account Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notification Preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    emailSecurity: true,
    emailLeads: true,
    emailBilling: true,
    smsAppointments: true,
    pushInstant: true,
    whatsappAlerts: false
  });

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await safeFetchJson('/api/auth/sessions');
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    setProfileLoading(true);
    const res = await updateProfile(displayName.trim(), email.trim());
    setProfileLoading(false);

    if (!res.success) {
      setProfileError(res.error || 'Failed to update profile.');
      return;
    }

    setProfileSuccess('Profile information updated successfully.');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    const res = await updatePassword(currentPassword, newPassword, confirmPassword);
    setPasswordLoading(false);

    if (!res.success) {
      setPasswordError(res.error || 'Failed to update password.');
      return;
    }

    setPasswordSuccess('Password successfully updated. Security alert dispatched.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // 2FA: Initiate setup
  const handleStart2FASetup = async () => {
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const data = await safeFetchJson('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: setupPhoneInput })
      });
      if (data.success) {
        setSetupChallengeId(data.challengeId);
        setTwoFactorStep('OTP');
      } else {
        setTwoFactorError(data.error || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Network error.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // 2FA: Confirm OTP
  const handleVerify2FA = async () => {
    if (!setupChallengeId || !setupOtpCode) return;
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const data = await safeFetchJson('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId: setupChallengeId,
          code: setupOtpCode
        })
      });
      if (data.success) {
        setTwoFactorEnabled(true);
        setTwoFactorPhone(setupPhoneInput);
        setShow2FASetupModal(false);
        setTwoFactorSuccess('Two-Factor Authentication has been successfully enabled.');
        setSetupOtpCode('');
        setTwoFactorStep('PHONE');
      } else {
        setTwoFactorError(data.error || 'Invalid code.');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Verification failed.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // 2FA: Disable
  const handleDisable2FA = async () => {
    if (!disablePasswordInput) return;
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const data = await safeFetchJson('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: disablePasswordInput })
      });
      if (data.success) {
        setTwoFactorEnabled(false);
        setTwoFactorPhone('');
        setShowDisable2FAModal(false);
        setDisablePasswordInput('');
        setTwoFactorSuccess('Two-Factor Authentication is now deactivated.');
      } else {
        setTwoFactorError(data.error || 'Failed to disable 2FA.');
      }
    } catch (err: any) {
      setTwoFactorError(err.message || 'Network request failed.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Revoke other sessions
  const handleRevokeOtherSessions = async () => {
    setRevokingSessions(true);
    try {
      const data = await safeFetchJson('/api/auth/sessions/revoke-others', {
        method: 'POST'
      });
      if (data.success) {
        loadSessions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRevokingSessions(false);
    }
  };

  // Export Data Archive
  const handleExportData = async () => {
    setExportLoading(true);
    setExportSuccess(null);
    try {
      const data = await safeFetchJson('/api/auth/export-data', {
        method: 'POST'
      });
      if (data.success && data.archive) {
        // Trigger browser JSON download
        const blob = new Blob([JSON.stringify(data.archive, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AgentDesk-Data-Export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess('Your complete GDPR archive has been generated and downloaded.');
      }
    } catch (e: any) {
      console.error('Export failed:', e);
    } finally {
      setExportLoading(false);
    }
  };

  // Request Account Deletion
  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const data = await safeFetchJson('/api/auth/request-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deletePassword,
          confirmationText: deleteConfirmText
        })
      });
      if (data.success) {
        logout();
      } else {
        setDeleteError(data.error || 'Failed to submit deletion request.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Request failed.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-400" />
          <span>Account Security, Credentials & Privacy</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your login credentials, configure two-factor authentication, monitor active sessions, and access data privacy tools.
        </p>
      </div>

      {twoFactorSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{twoFactorSuccess}</span>
          </div>
          <button onClick={() => setTwoFactorSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Profile Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Owner & Login Profile</h3>
              <p className="text-xs text-slate-400">Update your name and primary login address</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Owner Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Login Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@abctechnologies.com"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Changing your login email takes effect immediately and notifies your previous address.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Password Change */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Change Password</h3>
              <p className="text-xs text-slate-400">Update your private sign-in password</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 3: Two-Factor Authentication (2FA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  twoFactorEnabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Add an extra layer of defense by requiring an SMS one-time verification code on sign-in.
              </p>
            </div>
          </div>

          <div>
            {twoFactorEnabled ? (
              <button
                onClick={() => setShowDisable2FAModal(true)}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={() => { setShow2FASetupModal(true); setTwoFactorStep('PHONE'); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Enable 2FA via SMS
              </button>
            )}
          </div>
        </div>

        {twoFactorEnabled && (
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span>Registered Verification Phone:</span>
            <span className="font-mono text-slate-200 font-medium">
              {twoFactorPhone ? `${twoFactorPhone.slice(0, 4)}••••${twoFactorPhone.slice(-4)}` : '+1 (•••) •••-••••'}
            </span>
          </div>
        )}
      </div>

      {/* Section 4: Active Sessions & Device Security */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Sessions & Devices</h3>
              <p className="text-xs text-slate-400">Review all currently authenticated web sessions</p>
            </div>
          </div>

          <button
            onClick={handleRevokeOtherSessions}
            disabled={revokingSessions || sessions.length <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition disabled:opacity-40"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {sessions.map((s, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full ${s.isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <div>
                  <div className="font-mono text-slate-300">
                    Token: {s.id} {s.isCurrent && <span className="ml-2 text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-sans font-bold">Current Device</span>}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Signed in: {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Expires: {new Date(s.expiresAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Notification Preferences */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Multi-Channel Notification Channels</h3>
            <p className="text-xs text-slate-400">Configure how you receive operational and security alerts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Security & Sign-in Alerts</div>
              <div className="text-[11px] text-slate-500">Critical notifications (Locked ON)</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
              ALWAYS ON
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">New Inbound Leads</div>
              <div className="text-[11px] text-slate-500">Instant email on lead capture</div>
            </div>
            <input 
              type="checkbox" 
              checked={notifPrefs.emailLeads} 
              onChange={e => setNotifPrefs({...notifPrefs, emailLeads: e.target.checked})}
              className="accent-blue-500 w-4 h-4 rounded"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">SMS Appointment Confirmations</div>
              <div className="text-[11px] text-slate-500">Dispatched via Twilio SMS</div>
            </div>
            <input 
              type="checkbox" 
              checked={notifPrefs.smsAppointments} 
              onChange={e => setNotifPrefs({...notifPrefs, smsAppointments: e.target.checked})}
              className="accent-blue-500 w-4 h-4 rounded"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Browser Web Push</div>
              <div className="text-[11px] text-slate-500">Instant desktop pop-ups</div>
            </div>
            <input 
              type="checkbox" 
              checked={notifPrefs.pushInstant} 
              onChange={e => setNotifPrefs({...notifPrefs, pushInstant: e.target.checked})}
              className="accent-blue-500 w-4 h-4 rounded"
            />
          </div>
        </div>
      </div>

      {/* Section 6: Data Privacy & Account Deletion */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Data Portability & Account Lifecycle</h3>
            <p className="text-xs text-slate-400">Download your GDPR data archive or schedule account closure</p>
          </div>
        </div>

        {exportSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccess}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
          <div className="max-w-md">
            <h4 className="text-xs font-semibold text-slate-200">Export All Business Data</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Generates a machine-readable JSON archive containing all workspace profiles, leads, chat history, and configuration files.
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={exportLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
          >
            {exportLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export Data (JSON)</span>
          </button>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <h4 className="text-xs font-semibold text-rose-400">Delete Business Account</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Schedules this account and all associated AI agents for permanent erasure after a 7-day grace period.
            </p>
          </div>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteError(null); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Request Account Deletion</span>
          </button>
        </div>
      </div>

      {/* MODAL: 2FA SETUP */}
      {show2FASetupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                Two-Factor SMS Verification Setup
              </h3>
              <button onClick={() => setShow2FASetupModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {twoFactorError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {twoFactorError}
              </div>
            )}

            {twoFactorStep === 'PHONE' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Enter your mobile phone number in E.164 format (e.g. <code>+1234567890</code>). We will dispatch a 6-digit one-time code via Twilio SMS.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={setupPhoneInput}
                    onChange={e => setSetupPhoneInput(e.target.value)}
                    placeholder="+15551234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleStart2FASetup}
                  disabled={twoFactorLoading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {twoFactorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  Send 6-Digit Code
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Enter the 6-digit verification code dispatched to <strong className="text-white font-mono">{setupPhoneInput}</strong>.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={setupOtpCode}
                    onChange={e => setSetupOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-center text-lg tracking-widest text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTwoFactorStep('PHONE')}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Change Phone
                  </button>
                  <button
                    onClick={handleVerify2FA}
                    disabled={twoFactorLoading || setupOtpCode.length < 6}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {twoFactorLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    Confirm & Activate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DISABLE 2FA */}
      {showDisable2FAModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                Disable Two-Factor Authentication
              </h3>
              <button onClick={() => setShowDisable2FAModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              To deactivate 2FA security, please enter your current account password to confirm your identity.
            </p>

            {twoFactorError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {twoFactorError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Password</label>
              <input
                type="password"
                value={disablePasswordInput}
                onChange={e => setDisablePasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDisable2FAModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={twoFactorLoading || !disablePasswordInput}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNT DELETION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4" />
                Request Permanent Account Erasure
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-200">
              <strong>Notice:</strong> Your account will be locked immediately and permanently wiped after a 7-day grace period.
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Type <span className="text-rose-400 font-mono">DELETE MY ACCOUNT</span> to verify:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Confirm with Password:</label>
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE MY ACCOUNT' || !deletePassword}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-40"
              >
                Permanently Schedule Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
