import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { SUMMIT_ID, SHARMA_ID } from '../data/seedData';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  activeBusinessId: string;
  setActiveBusinessId: (id: string) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole, workspaceName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchRoleForDemo: (role: UserRole, businessId?: string, customName?: string, customEmail?: string) => void;
}

function formatBusinessName(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getStoredAuthUser(): UserProfile | null {
  try {
    const saved = localStorage.getItem('agentdesk_auth_user');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  // Default to Platform Admin (SaaS Owner)
  return {
    uid: 'platform-admin-1',
    email: 'admin@ai-revenueos.internal',
    displayName: 'Platform Admin',
    role: 'PLATFORM_ADMIN',
    businessId: SUMMIT_ID
  };
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredAuthUser());
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>(() => {
    try {
      const savedTenant = localStorage.getItem('agentdesk_active_tenant_id');
      if (savedTenant) return savedTenant;
    } catch (e) {}
    const user = getStoredAuthUser();
    return user?.businessId || 'aec-overseas';
  });
  const [loading, setLoading] = useState<boolean>(false);

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id);
    try {
      localStorage.setItem('agentdesk_active_tenant_id', id);
    } catch (e) {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            setCurrentUser(profile);
            if (profile.businessId) {
              setActiveBusinessId(profile.businessId);
            }
            try {
              localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
            } catch (e) {}
          }
        } catch (err) {
          console.warn('Error fetching user profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.warn('Firebase login fallback:', err);
    }

    const lowerEmail = email.toLowerCase().trim();
    let role: UserRole = 'BUSINESS_ADMIN';
    let targetBizId = activeBusinessId || 'aec-overseas';
    let displayName = email.split('@')[0];

    if (lowerEmail.includes('agentdesk') || lowerEmail.includes('platform') || lowerEmail.includes('owner')) {
      role = 'PLATFORM_ADMIN';
      displayName = 'Platform Admin';
    } else {
      role = 'BUSINESS_ADMIN';
      const domain = lowerEmail.split('@')[1]?.split('.')[0] || 'custom-workspace';
      targetBizId = domain;
      displayName = `${formatBusinessName(domain)} Admin`;
    }

    const profile: UserProfile = {
      uid: 'user-' + Date.now(),
      email,
      displayName,
      role,
      businessId: targetBizId
    };

    setCurrentUser(profile);
    setActiveBusinessId(targetBizId);
    try {
      localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
    } catch (e) {}
    setLoading(false);
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    role: UserRole = 'BUSINESS_ADMIN',
    workspaceName?: string
  ) => {
    setLoading(true);
    let targetBizId = 'new-tenant';

    if (workspaceName && workspaceName.trim()) {
      targetBizId = workspaceName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    } else {
      const lowerEmail = email.toLowerCase().trim();
      const domain = lowerEmail.split('@')[1]?.split('.')[0] || 'new-workspace';
      targetBizId = domain;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const profile: UserProfile = {
        uid: res.user.uid,
        email,
        displayName: name,
        role,
        businessId: targetBizId,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', res.user.uid), profile);
      setCurrentUser(profile);
      setActiveBusinessId(targetBizId);
      try {
        localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
      } catch (e) {}
    } catch (err) {
      console.warn('Firebase signup fallback, setting local profile:', err);
      const profile: UserProfile = {
        uid: 'user-' + Date.now(),
        email,
        displayName: name,
        role,
        businessId: targetBizId
      };
      setCurrentUser(profile);
      setActiveBusinessId(targetBizId);
      try {
        localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn('Google login popup fallback:', err);
      const profile: UserProfile = {
        uid: 'google-user-1',
        email: 'admin@agentdesk.ai',
        displayName: 'Platform Admin',
        role: 'PLATFORM_ADMIN',
        businessId: activeBusinessId || 'aec-overseas'
      };
      setCurrentUser(profile);
      try {
        localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Signout error:', err);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('agentdesk_auth_user');
      localStorage.removeItem('agentdesk_active_tenant_id');
    } catch (e) {}
  };

  const switchRoleForDemo = (
    role: UserRole, 
    businessId?: string, 
    customName?: string, 
    customEmail?: string
  ) => {
    let finalBizId = businessId || activeBusinessId || 'aec-overseas';
    let finalName = customName;
    let finalEmail = customEmail;

    if (role === 'PLATFORM_ADMIN') {
      finalName = 'Platform Admin';
      finalEmail = 'admin@agentdesk.ai';
    } else {
      finalName = customName || 'Business Admin';
      finalEmail = customEmail || `admin@${finalBizId}.com`;
    }

    const profile: UserProfile = {
      uid: `demo-${role.toLowerCase()}-${finalBizId}`,
      email: finalEmail,
      displayName: finalName,
      role,
      businessId: finalBizId
    };

    setCurrentUser(profile);
    if (finalBizId) {
      setActiveBusinessId(finalBizId);
    }
    try {
      localStorage.setItem('agentdesk_auth_user', JSON.stringify(profile));
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      firebaseUser,
      loading,
      activeBusinessId,
      setActiveBusinessId,
      loginWithEmail,
      signUpWithEmail,
      loginWithGoogle,
      logout,
      switchRoleForDemo
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
