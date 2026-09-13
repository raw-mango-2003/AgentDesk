import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  RefreshCw, 
  Plus, 
  ShieldCheck, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Search, 
  Building2, 
  Clock, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  X,
  History,
  FileText
} from 'lucide-react';
import { Business } from '../../types';

interface TenantCredentialItem {
  tenantId: string;
  businessName: string;
  industry?: string;
  plan?: string;
  planStatus?: string;
  hasLoginCredentials: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED' | 'PENDING';
    mustChangePassword: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  usersCount: number;
}

interface AuditLogItem {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetUserId?: string;
  targetUserEmail: string;
  targetTenantId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface BusinessLoginManagementProps {
  businesses: Business[];
  onRefreshBusinesses?: () => void;
}

export const BusinessLoginManagement: React.FC<BusinessLoginManagementProps> = ({
  businesses,
  onRefreshBusinesses
}) => {
  const [credentialsList, setCredentialsList] = useState<TenantCredentialItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Modals state
  const [createModalTenant, setCreateModalTenant] = useState<Business | null>(null);
  const [resetModalItem, setResetModalItem] = useState<TenantCredentialItem | null>(null);
  const [changeEmailItem, setChangeEmailItem] = useState<TenantCredentialItem | null>(null);

  // Form inputs
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Generated password banner (shown ONCE to Platform Admin)
  const [revealedCredentials, setRevealedCredentials] = useState<{
    businessName: string;
    ownerEmail: string;
    tempPassword: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const token = localStorage.getItem('agentdesk_session_token') || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const [credRes, auditRes] = await Promise.all([
        fetch('/api/auth/platform/credentials', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/auth/platform/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (credRes.ok) {
        const cData = await credRes.json();
        setCredentialsList(cData.tenants || []);
      }
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(aData.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load credential management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateLocalStrongPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*()';
    const all = upper + lower + digits + symbols;
    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];
    for (let i = 4; i < 14; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const handleOpenCreate = (biz: Business) => {
    setCreateModalTenant(biz);
    setOwnerName(biz.ownerName || (biz as any).customerName || '');
    setOwnerEmail(biz.email || '');
    setTempPassword(generateLocalStrongPassword());
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createModalTenant) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/auth/platform/credentials/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tenantId: createModalTenant.id,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          temporaryPassword: tempPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate credentials.');
      }

      setRevealedCredentials({
        businessName: createModalTenant.name,
        ownerEmail: data.user?.email || ownerEmail.trim(),
        tempPassword: data.temporaryPassword || tempPassword
      });

      setCreateModalTenant(null);
      setNotification({
        type: 'success',
        message: `Login credentials generated for "${createModalTenant.name}". Make sure to copy the temporary password.`
      });
      await loadData();
      if (onRefreshBusinesses) onRefreshBusinesses();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error provisioning login credentials.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalItem || !resetModalItem.owner) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/auth/platform/credentials/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: resetModalItem.owner.id,
          temporaryPassword: tempPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset credentials.');
      }

      setRevealedCredentials({
        businessName: resetModalItem.businessName,
        ownerEmail: resetModalItem.owner.email,
        tempPassword: data.temporaryPassword
      });

      setResetModalItem(null);
      setNotification({
        type: 'success',
        message: `Temporary password generated for ${resetModalItem.owner.email}. Password change required upon login.`
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error generating new credentials.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeEmailItem || !changeEmailItem.owner) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/auth/platform/credentials/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: changeEmailItem.owner.id,
          newEmail: newEmail.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change login email.');
      }

      setChangeEmailItem(null);
      setNotification({
        type: 'success',
        message: `Login email for "${changeEmailItem.businessName}" changed to ${newEmail.trim()}.`
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error changing login email.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (item: TenantCredentialItem, nextStatus: 'ACTIVE' | 'DISABLED') => {
    if (!item.owner) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/auth/platform/credentials/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: item.owner.id,
          status: nextStatus
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to toggle account status.');
      }

      setNotification({
        type: 'success',
        message: `Account for ${item.owner.email} is now ${nextStatus}.`
      });
      await loadData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error toggling account status.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredList = credentialsList.filter(item => 
    item.businessName.toLowerCase().includes(search.toLowerCase()) ||
    item.tenantId.toLowerCase().includes(search.toLowerCase()) ||
    (item.owner?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.owner?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-md ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ONE-TIME PASSWORD REVEAL BANNER (Requirement 3: shown ONCE to Platform Admin) */}
      {revealedCredentials && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-900/90 to-indigo-900/90 text-white border-2 border-purple-500 shadow-2xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-400/20 border border-purple-400/30 text-[10px] font-extrabold uppercase tracking-wider text-purple-200">
                  Temporary Credentials Generated • Shown Once
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  Credentials for {revealedCredentials.businessName}
                </h3>
              </div>
            </div>
            <button 
              onClick={() => setRevealedCredentials(null)}
              className="p-1.5 text-purple-200 hover:text-white rounded-lg hover:bg-purple-800/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-purple-200 mt-2">
            This temporary password is cryptographically hashed in the database and will <strong>NOT</strong> be displayed again. Provide it securely to the business owner. They will be required to create a new password on their first login.
          </p>

          <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="space-y-1">
              <div><span className="text-purple-400">Login URL:</span> <span className="text-slate-300">/login</span></div>
              <div><span className="text-purple-400">Email:</span> <span className="text-white font-bold">{revealedCredentials.ownerEmail}</span></div>
              <div><span className="text-purple-400">Temp Password:</span> <span className="text-amber-300 font-extrabold text-sm">{revealedCredentials.tempPassword}</span></div>
            </div>

            <button
              onClick={() => copyToClipboard(`AgentDesk Business Workspace Credentials\nLogin URL: /login\nEmail: ${revealedCredentials.ownerEmail}\nTemporary Password: ${revealedCredentials.tempPassword}\n(You will be prompted to create your private password on first sign-in)`)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <span>Business Login Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage business owner login accounts, reset passwords, change emails, and audit authentication activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuditModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by business name, tenant ID, owner name, or email..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-xs"
        />
      </div>

      {/* Table / List of Business Login Credentials */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Business / Tenant</th>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Login Email</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Security Policy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredList.map((item) => {
                const isConfigured = item.hasLoginCredentials && item.owner;
                const bizObject = businesses.find(b => b.id === item.tenantId) || ({
                  id: item.tenantId,
                  name: item.businessName,
                  industry: item.industry || '',
                  email: item.owner?.email || '',
                  ownerName: item.owner?.name || '',
                  description: '',
                  website: '',
                  supportEmail: item.owner?.email || '',
                  agentSettings: {
                    agentName: 'AI Receptionist',
                    welcomeMessage: 'Hello, how can I help you?',
                    businessDescription: '',
                    tone: 'Professional',
                    primaryColor: '#2563eb',
                    secondaryColor: '#4f46e5',
                    suggestedQuestions: []
                  },
                  plan: 'growth',
                  status: 'active'
                } as Business);

                return (
                  <tr key={item.tenantId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.businessName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.tenantId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isConfigured ? (
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.owner!.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No credentials created</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isConfigured ? (
                        <div className="font-mono text-slate-800 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.owner!.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isConfigured ? (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          item.owner!.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.owner!.status === 'DISABLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.owner!.status === 'ACTIVE' ? (
                            <Unlock className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          <span>{item.owner!.status}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          Unprovisioned
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isConfigured ? (
                        <div>
                          {item.owner!.mustChangePassword ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Must Change Password
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Password Established
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {isConfigured ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset / Generate Temp Password */}
                          <button
                            onClick={() => {
                              setResetModalItem(item);
                              setTempPassword(generateLocalStrongPassword());
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Generate temporary password"
                          >
                            Reset Password
                          </button>

                          {/* Change Email */}
                          <button
                            onClick={() => {
                              setChangeEmailItem(item);
                              setNewEmail(item.owner!.email);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Change login email"
                          >
                            Change Email
                          </button>

                          {/* Disable / Enable Account */}
                          {item.owner!.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleToggleStatus(item, 'DISABLED')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Disable account immediately"
                            >
                              Disable
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(item, 'ACTIVE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Re-activate account"
                            >
                              Enable
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCreate(bizObject)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 ml-auto shadow-xs cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create Login</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No businesses matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BUSINESS LOGIN MODAL (Requirement 3) */}
      {createModalTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCreateModalTenant(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Business Login</h3>
                <p className="text-xs text-slate-500">{createModalTenant.name}</p>
              </div>
            </div>

            <form onSubmit={handleCreateLogin} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Tenant
                </label>
                <input
                  type="text"
                  disabled
                  value={`${createModalTenant.name} (${createModalTenant.id})`}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="e.g. john@abctechnologies.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPassword(generateLocalStrongPassword())}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full bg-purple-50/50 border border-purple-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-purple-900 focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The password will be securely hashed with scrypt. The owner will be required to change it on first login.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalTenant(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Creating...' : 'Create Login'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalItem && resetModalItem.owner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setResetModalItem(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Credentials</h3>
                <p className="text-xs text-slate-500">{resetModalItem.businessName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Generating a new temporary password will invalidate all active sessions for <strong>{resetModalItem.owner.email}</strong>. The user will be required to set a new password upon their next login.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempPassword(generateLocalStrongPassword())}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setResetModalItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Updating...' : 'Generate New Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE LOGIN EMAIL MODAL */}
      {changeEmailItem && changeEmailItem.owner && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setChangeEmailItem(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Login Email</h3>
                <p className="text-xs text-slate-500">{changeEmailItem.businessName}</p>
              </div>
            </div>

            <form onSubmit={handleChangeEmail} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Email
                </label>
                <input
                  type="text"
                  disabled
                  value={changeEmailItem.owner.email}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Login Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. newowner@company.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setChangeEmailItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Updating...' : 'Update Login Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL (Requirement 11 & 16) */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Credential Audit Trail</h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-2 flex-1 divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-700">
                    <span className="text-slate-400">Actor:</span> <strong>{log.actorEmail}</strong> ({log.actorRole})
                  </div>
                  <div className="text-slate-700">
                    <span className="text-slate-400">Target:</span> <strong>{log.targetUserEmail}</strong> {log.targetTenantId ? `[Tenant: ${log.targetTenantId}]` : ''}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1 p-2 rounded-lg bg-slate-50 text-[11px] font-mono text-slate-600">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              ))}

              {auditLogs.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No credential audit records logged yet.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
