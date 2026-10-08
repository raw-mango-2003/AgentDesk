import React, { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/react';

export const ClerkSessionBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user } = useUser();
  const syncingUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || syncingUserId.current === user.id) return;

    let cancelled = false;
    syncingUserId.current = user.id;

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch('/api/auth/clerk/sync', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({})
        });

        const data = await response.json().catch(() => null);
        if (!cancelled && response.ok && data?.success) {
          window.dispatchEvent(new CustomEvent('agentdesk:clerk-synced', {
            detail: { onboardingPending: Boolean(data.onboardingPending) }
          }));
        }
      } catch {
        syncingUserId.current = null;
      }
    })();

    return () => { cancelled = true; };
  }, [getToken, isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    const handleLogout = () => {
      signOut().catch(() => undefined);
    };
    window.addEventListener('agentdesk:logout', handleLogout);
    return () => window.removeEventListener('agentdesk:logout', handleLogout);
  }, [signOut]);

  return <>{children}</>;
};
