import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { safeFetchJson } from '../lib/apiClient';

export interface TenantInfo {
  id: string;
  name: string;
  status: 'ONBOARDING' | 'PAYMENT_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | string;
  plan?: string;
  currency?: string;
  subscriptionState?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  currentTenant: TenantInfo | null;
  loading: boolean;
  activeBusinessId: string;
  setActiveBusinessId: (id: string) => void;
  loginBusiness: (email: string, pass: string) => Promise<{ success: boolean; error?: string; onboardingPending?: boolean; mustChangePassword?: boolean; user?: UserProfile; tenant?: TenantInfo | null; requiresEmailVerification?: boolean }>;
  loginPlatformAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  signupBusiness: (name: string, email: string, pass: string, confirmPass?: string) => Promise<{ success: boolean; error?: string; user?: UserProfile; onboardingStep?: string; requiresEmailVerification?: boolean; message?: string }>;
  logout: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateProfile: (name?: string, email?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  saveBusinessDetails: (details: { businessName: string; industry?: string; teamSize?: string; phone?: string; website?: string }) => Promise<{ success: boolean; tenantId?: string; error?: string }>;
  refreshAuth: () => Promise<void>;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id);
  };

  const enforceRoleScopedRoutes = (user: UserProfile | null) => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.toLowerCase();

    const isPlatformAdminOnly = path === '/dashboard/integrations' || path === '/admin/design-studio';

    if (!isPlatformAdminOnly) return;

    if (!user) {
      window.history.replaceState({ ...(window.history.state || {}), agentDeskRoute: true, agentDeskView: 'login', agentDeskTab: undefined, agentDeskScrollY: 0 }, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
      return;
    }

    if (user.role !== 'PLATFORM_ADMIN') {
      window.history.replaceState({ ...(window.history.state || {}), agentDeskRoute: true, agentDeskView: 'dashboard', agentDeskTab: 'overview', agentDeskScrollY: 0 }, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    }
  };

  const fetchSessionUser = async () => {
    try {
      const res = await safeFetchJson('/api/auth/me');
      if (res.success && res.user) {
        setCurrentUser(res.user);
        if (res.tenant) {
          setCurrentTenant(res.tenant);
          setActiveBusinessIdState(res.tenant.id);
        } else if (res.user.tenantId && res.user.tenantId !== 'platform') {
          setActiveBusinessIdState(res.user.tenantId);
        }
        enforceRoleScopedRoutes(res.user);
        return;
      }
      setCurrentUser(null);
      setCurrentTenant(null);
      setActiveBusinessIdState('');
      enforceRoleScopedRoutes(null);
    } catch (err) {
      console.warn('Failed to verify authentication session:', err);
      // Fail closed: never retain a previously selected tenant after session verification fails.
      setCurrentUser(null);
      setCurrentTenant(null);
      setActiveBusinessIdState('');
      enforceRoleScopedRoutes(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await fetchSessionUser();
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshAuth = async () => {
    await fetchSessionUser();
  };

  const loginBusiness = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : res.message || 'Authentication failed');
        return { 
          success: false, 
          error: errorMsg,
          requiresEmailVerification: !!((res as any).requiresEmailVerification || (res as any).code === 'EMAIL_NOT_VERIFIED' || res.error?.code === 'EMAIL_NOT_VERIFIED')
        };
      }

      const meRes = await safeFetchJson('/api/auth/me');
      if (!meRes.success || !meRes.user) {
        setCurrentUser(null);
        setCurrentTenant(null);
        setActiveBusinessIdState('');
        return {
          success: false,
          error: 'Authentication failed: Backend session could not be established or verified via HttpOnly cookie.'
        };
      }

      setCurrentUser(meRes.user);
      setCurrentTenant(meRes.tenant || null);
      setActiveBusinessIdState(meRes.tenant?.id || (meRes.user?.tenantId && meRes.user.tenantId !== 'platform' ? meRes.user.tenantId : ''));
      enforceRoleScopedRoutes(meRes.user);

      return {
        success: true,
        user: meRes.user,
        tenant: meRes.tenant || res.tenant,
        mustChangePassword: !!(meRes.user.mustChangePassword ?? res.mustChangePassword),
        onboardingPending: res.onboardingPending
      };
    } catch (err: any) {
      setCurrentUser(null);
      setCurrentTenant(null);
      setActiveBusinessIdState('');
      return { success: false, error: err.message || 'Network error during login' };
    } finally {
      setLoading(false);
    }
  };

  const loginPlatformAdmin = async (email: string, pass: string) => {
    setLoading(true);
    try {
      let res = await safeFetchJson('/api/auth/platform/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      if (!res.success && res.status === 404) {
        res = await safeFetchJson('/api/auth/platform-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
      }

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Platform Administrator login failed');
        return { success: false, error: errorMsg };
      }

      const meRes = await safeFetchJson('/api/auth/me');
      if (!meRes.success || !meRes.user || meRes.user.role !== 'PLATFORM_ADMIN') {
        setCurrentUser(null);
        setCurrentTenant(null);
        setActiveBusinessIdState('');
        return {
          success: false,
          error: 'Authentication failed: Backend session could not be established or verified via HttpOnly cookie.'
        };
      }

      setCurrentUser(meRes.user);
      setCurrentTenant(null);
      setActiveBusinessIdState('platform');
      enforceRoleScopedRoutes(meRes.user);

      return {
        success: true,
        user: meRes.user
      };
    } catch (err: any) {
      setCurrentUser(null);
      setCurrentTenant(null);
      setActiveBusinessIdState('');
      return { success: false, error: err.message || 'Network error during platform admin sign in' };
    } finally {
      setLoading(false);
    }
  };

  const signupBusiness = async (name: string, email: string, pass: string, confirmPass?: string) => {
    setLoading(true);
    try {
      const res = await safeFetchJson('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass, confirmPassword: confirmPass })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Account creation failed');
        return { success: false, error: errorMsg };
      }

      if (res.user) {
        const meRes = await safeFetchJson('/api/auth/me');
        if (meRes.success && meRes.user) {
          setCurrentUser(meRes.user);
          enforceRoleScopedRoutes(meRes.user);
        }
      }

      return {
        success: true,
        user: res.user,
        requiresEmailVerification: (res as any).requiresEmailVerification,
        message: (res as any).message,
        onboardingStep: (res as any).onboardingStep
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during account registration' };
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessDetails = async (details: { businessName: string; industry?: string; teamSize?: string; phone?: string; website?: string }) => {
    try {
      const res = await safeFetchJson('/api/auth/onboarding/business-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to save business details');
        return { success: false, error: errorMsg };
      }

      const tenantId = (res as any).tenantId;
      if (tenantId) setActiveBusinessIdState(tenantId);
      if (res.tenant) setCurrentTenant(res.tenant);
      if (currentUser && tenantId) {
        setCurrentUser({ ...currentUser, tenantId, businessId: tenantId });
      }

      return { success: true, tenantId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save business details' };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string, confirmPassword?: string) => {
    try {
      const res = await safeFetchJson('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to update password.');
        return { success: false, error: errorMsg };
      }

      if (res.user && currentUser) {
        setCurrentUser({ ...currentUser, mustChangePassword: false, ...res.user });
      }
      return { success: true, message: res.message || 'Password updated successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const updateProfile = async (name?: string, email?: string) => {
    try {
      const res = await safeFetchJson('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to update profile.');
        return { success: false, error: errorMsg };
      }

      if (res.user && currentUser) setCurrentUser({ ...currentUser, ...res.user });
      return { success: true, message: res.message || 'Profile updated successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile.' };
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    setCurrentTenant(null);
    setActiveBusinessIdState('');
    localStorage.removeItem('agentdesk_auth_user');
    localStorage.removeItem('agentdesk_active_tenant_id');

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      await safeFetchJson('/api/auth/logout', { method: 'POST', signal: controller.signal });
      window.clearTimeout(timeoutId);
    } catch (e) {
      // Local auth state is already cleared.
    }
  };


  const isAuthenticated = !!currentUser;
  const isPlatformAdmin = currentUser?.role === 'PLATFORM_ADMIN';
  const mustChangePassword = !!currentUser?.mustChangePassword;

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentTenant,
      loading,
      activeBusinessId,
      setActiveBusinessId,
      loginBusiness,
      loginPlatformAdmin,
      signupBusiness,
      saveBusinessDetails,
      updatePassword,
      updateProfile,
      logout,
      refreshAuth,
      isAuthenticated,
      isPlatformAdmin,
      mustChangePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
