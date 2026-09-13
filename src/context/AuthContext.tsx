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
  loginBusiness: (email: string, pass: string) => Promise<{ success: boolean; error?: string; onboardingPending?: boolean; mustChangePassword?: boolean; user?: UserProfile; tenant?: TenantInfo | null }>;
  loginPlatformAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  signupBusiness: (name: string, email: string, pass: string, confirmPass?: string) => Promise<{ success: boolean; error?: string; user?: UserProfile; onboardingStep?: string }>;
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

const TOKEN_KEY = 'agentdesk_session_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id);
  };

  const fetchSessionUser = async (token: string) => {
    try {
      const res = await safeFetchJson('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        if (res.tenant) {
          setCurrentTenant(res.tenant);
          setActiveBusinessIdState(res.tenant.id);
        } else if (res.user.tenantId && res.user.tenantId !== 'platform') {
          setActiveBusinessIdState(res.user.tenantId);
        }
        return;
      }
      // Invalid session
      localStorage.removeItem(TOKEN_KEY);
      setCurrentUser(null);
      setCurrentTenant(null);
      setActiveBusinessIdState('');
    } catch (err) {
      console.warn('Failed to verify authentication session:', err);
      // Do not silently fallback to admin on error
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetchSessionUser(token);
      } else {
        setCurrentUser(null);
        setCurrentTenant(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const refreshAuth = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await fetchSessionUser(token);
    }
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
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Authentication failed');
        return { success: false, error: errorMsg };
      }

      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      if (res.user) {
        setCurrentUser(res.user);
      }
      if (res.tenant) {
        setCurrentTenant(res.tenant);
        setActiveBusinessIdState(res.tenant.id);
      } else if (res.user?.tenantId) {
        setActiveBusinessIdState(res.user.tenantId);
      }

      return {
        success: true,
        user: res.user,
        tenant: res.tenant,
        mustChangePassword: !!res.mustChangePassword,
        onboardingPending: res.onboardingPending
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    } finally {
      setLoading(false);
    }
  };

  const loginPlatformAdmin = async (email: string, pass: string) => {
    setLoading(true);
    try {
      // Support both /api/auth/platform/login and legacy /api/auth/platform-login
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

      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      if (res.user) {
        setCurrentUser(res.user);
      }
      setCurrentTenant(null);
      setActiveBusinessIdState('platform');

      return {
        success: true,
        user: res.user
      };
    } catch (err: any) {
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

      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      if (res.user) {
        setCurrentUser(res.user);
      }

      return {
        success: true,
        user: res.user,
        onboardingStep: (res as any).onboardingStep
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during account registration' };
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessDetails = async (details: {
    businessName: string;
    industry?: string;
    teamSize?: string;
    phone?: string;
    website?: string;
  }) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    try {
      const res = await safeFetchJson('/api/auth/onboarding/business-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(details)
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to save business details');
        return { success: false, error: errorMsg };
      }

      const tenantId = (res as any).tenantId;
      if (tenantId) {
        setActiveBusinessIdState(tenantId);
      }
      if (res.tenant) {
        setCurrentTenant(res.tenant);
      }
      if (currentUser && tenantId) {
        setCurrentUser({
          ...currentUser,
          tenantId,
          businessId: tenantId
        });
      }

      return { success: true, tenantId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save business details' };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string, confirmPassword?: string) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return { success: false, error: 'Authentication required.' };
    }
    try {
      const res = await safeFetchJson('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to update password.');
        return { success: false, error: errorMsg };
      }

      if (res.user && currentUser) {
        setCurrentUser({
          ...currentUser,
          mustChangePassword: false,
          ...res.user
        });
      }
      return { success: true, message: res.message || 'Password updated successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const updateProfile = async (name?: string, email?: string) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return { success: false, error: 'Authentication required.' };
    }
    try {
      const res = await safeFetchJson('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });

      if (!res.success) {
        const errorMsg = res.error?.message || (typeof (res as any).error === 'string' ? (res as any).error : 'Failed to update profile.');
        return { success: false, error: errorMsg };
      }

      if (res.user && currentUser) {
        setCurrentUser({
          ...currentUser,
          ...res.user
        });
      }
      return { success: true, message: res.message || 'Profile updated successfully.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile.' };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {}
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('agentdesk_auth_user');
    localStorage.removeItem('agentdesk_active_tenant_id');
    setCurrentUser(null);
    setCurrentTenant(null);
    setActiveBusinessIdState('');
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
